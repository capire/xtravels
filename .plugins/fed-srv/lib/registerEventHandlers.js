const cds = require('@sap/cds');
const { mapAndFilterKeysToEntityModel } = require('./utils');

function readDelegation(service, remoteSrvName, entities) {
  const remoteSrvProm = cds.connect.to(remoteSrvName);
  // REVISIT: This prevents other event handlers from being registered
  service.prepend(() => {
    service.on('READ', entities, async req => (await remoteSrvProm).run(req.query));
  });
}

function conditionalReadDelegation(service, entities) {
  const dbProm = cds.connect.to('db');

  service.prepend(() => {
    service.on('READ', entities, async (req, next) => {
      // try to access local replica first
      try {
        const db = await dbProm;
        const localResults = await db.run(req.query);

        const shouldDelegate = (() => {
          if (!localResults || localResults.length === 0) return true;

          // Handle $count queries
          if (localResults.length === 1 && localResults[0].$count === 0) return true;

          return false;
        })();

        if (shouldDelegate) return next();
        else return localResults;
        
      } catch (error) {
        cds.log('srv-fed').error(`Error accessing local replica for ${req.target.name}:`, error);
      }

      // If not found locally, delegate to remote
      return next();
    });
  });
}

function expand(service, baseEntity, expandTargets) {
  service.prepend(() => {
    service.on('READ', baseEntity, async (req, next) => {
      const select = req.query.SELECT;
      if (!select.columns) return next();

      const baseEntityDef = cds.model.definitions[baseEntity];
      const expandableAssocs = Object.values(baseEntityDef.elements)
        .filter(e => e.type === 'cds.Association' && expandTargets.includes(e.target))
        .reduce((acc, e) => ({ ...acc, [e.name]: e }), {});

      const expandOps = select.columns
        .map((col, index) => ({ ...col, index }))
        .filter(({ expand, ref }) => expand && expandableAssocs[ref?.[0]])
        .reverse(); // necessary to maintain order of indices

      if (expandOps.length === 0) return next();

      // remove all expands from query
      for (const op of expandOps) {
        req.query.SELECT.columns.splice(op.index, 1);
        const assoc = expandableAssocs[op.ref[0]];
        const foreignKey = assoc.keys ? assoc.keys[0].$generatedFieldName : assoc.on[2].ref[0];
        if (foreignKey) ensureForeignKeySelected(req.query.SELECT, foreignKey);
      }

      // execute the base query
      const entity = await next();
      if (Array.isArray(entity) && entity.length > 0) {
        throw new Error(`Expand only allowed when requesting one ${baseEntity.split('.').pop()}.`);
      }

      const result = Array.isArray(entity) ? entity[0] : entity;
      if (!result) return entity;

      // process each expand operation
      await Promise.all(expandOps.map(async (op) => {
        const assoc = expandableAssocs[op.ref[0]];
        const foreignKey = assoc.keys ? assoc.keys[0].$generatedFieldName : assoc.on[2].ref[0];
        const targetKey = assoc.keys ? foreignKey.split('_').pop() : assoc.on[0].ref[1];

        if (result[foreignKey] != null) {
          // query the expanded target entity
          const expandedData = await service.run(
            SELECT(op.expand).from(assoc.target).where(targetKey, '=', result[foreignKey])
          );

          // attach expanded data to the base entity
          result[op.ref[0]] = isToOneAssociation(assoc) && expandedData.length === 1
            ? expandedData[0]
            : expandedData;
        }
      }));

      return result;
    });
  });
}

function ensureForeignKeySelected(selectQuery, foreignKey) {
  const hasFK = selectQuery.columns.some(col =>
    col.ref?.[0] === foreignKey ||
    (col.ref?.[0] === '*')
  );

  if (!hasFK) {
    selectQuery.columns.push({ ref: [foreignKey] });
  }
}

function isToOneAssociation(association) {
  return association.is2one && !association.is2many;
}

function navigation(service, navTarget) {
  service.prepend(() => {
    service.on('READ', navTarget, async (req, next) => {
      const select = req.query.SELECT;
      if (select.from.ref.length !== 2) return next();

      const [baseEntityName, assocName] = req.path.split('/');
      const baseEntityRef = req.subject.ref[0];

      // get association
      const baseEntityDef = cds.model.definitions[baseEntityName];
      const assoc = baseEntityDef.elements[assocName];

      if (!assoc || assoc.type !== 'cds.Association' || assoc.target !== navTarget) next();

      // extract foreign and target keys
      const foreignKey = assoc.keys ? assoc.keys[0].$generatedFieldName : assoc.on[2].ref[0];
      const targetKey = assoc.keys ? foreignKey.split('_').pop() : assoc.on[0].ref[1];

      // get foreign key value from base entity
      const baseEntity = await service.run(
        SELECT.one(foreignKey).from(baseEntityRef.id).where(baseEntityRef.where)
      );

      if (!baseEntity || baseEntity[foreignKey] == null) {
        return [];
      }

      // query the target entity
      const result = await service.run(
        SELECT(select.columns).from(navTarget).where(targetKey, '=', baseEntity[foreignKey])
          .limit(select.limit?.rows?.val, select.limit?.offset?.val));

      return result;
    })
  });
}

function demandReplication(service, remoteSrvName, localEntity, assocTarget) {

  service.prepend(() => {
    const dbProm = cds.connect.to('db');
    const remoteSrvProm = cds.connect.to(remoteSrvName);

    service.on(['CREATE', 'UPDATE', 'UPSERT'], localEntity, async (req, next) => {
      const db = await dbProm;
      const remoteService = await remoteSrvProm;

      const targetEntity = cds.model.definitions[assocTarget];

      const elements = req.target.elements;
      const associationName = Object.entries(elements)
        .filter(([key, def]) => def.target === assocTarget)
        .map(([key]) => key);

      // req.target.elements[aName].foreignKeys
      const keys = {};
      for (const key in targetEntity.keys) {
        keys[key] = req.data[associationName[0] + '_' + key];
      }

      let replica = await db.exists(targetEntity, keys);
      if (!replica) {
        replica = await remoteService.read(targetEntity, keys);
        await UPSERT.into(targetEntity).entries(replica);
      }
      return next();
    });
  });
}

async function updateReplicationOnEvent(remoteSrvName, eventDef, entity) {
  const dbProm = cds.connect.to('db');
  const rs = await cds.connect.to(remoteSrvName);

  let { name } = eventDef;
  name = name.substring(name.indexOf('.') + 1);

  rs.prepend(() => {
    rs.on(name, async msg => {
      const db = await dbProm;
      // REVISIT: If msg just contains one value, then keys = msg.data;
      let keys = {};
      for (const key in eventDef.keys) {
        keys[key] = msg.data[key];
      }

      keys = mapAndFilterKeysToEntityModel(remoteSrvName, entity, keys);
      let replica = await db.exists(entity, keys);
      if (replica) {
        replica = await rs.read(entity, keys);
        await UPDATE(entity).with(replica);
      }
    });
  });
}

function eventListenerForReplication(service, remoteSrvName, entity) {
  const eventName = `replicate_${entity}`;

  service.on(eventName, async (msg) => {
    try {
      const db = await cds.connect.to('db');
      const remoteService = await cds.connect.to(remoteSrvName);

      // Fetch all data from remote
      const remoteData = await remoteService.read(entity);

      if (remoteData && remoteData.length > 0) {
        // Clear existing data and insert new data
        await db.run(DELETE.from(entity));
        await db.run(INSERT.into(entity).entries(remoteData));

        console.log(`Replicated ${remoteData.length} records for ${entity}`);
      }
    } catch (error) {
      console.error(`Replication failed for ${entity}:`, error);
    }
  });
}

module.exports = {
  readDelegation,
  conditionalReadDelegation,
  demandReplication,
  updateReplicationOnEvent,
  navigation,
  expand,
  eventListenerForReplication
};
