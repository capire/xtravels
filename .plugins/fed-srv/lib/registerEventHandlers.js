const cds = require('@sap/cds');
const { mapAndFilterKeysToEntityModel } = require('./utils');

function readDelegation(service, remoteSrvName, entities) {
  const remoteSrvProm = cds.connect.to(remoteSrvName);
  // REVISIT: This prevents other event handlers from being registered
  service.prepend(() => {
    service.on('READ', entities, async req => (await remoteSrvProm).run(req.query));
  });
}

function demandReplication(service, remoteSrvName, associationTarget, entities) {

  service.prepend(() => {
    const dbProm = cds.connect.to('db');
    const remoteSrvProm = cds.connect.to(remoteSrvName);

    service.on(['CREATE', 'UPDATE', 'UPSERT'], entities, async (req, next) => {
      const db = await dbProm;
      const remoteService = await remoteSrvProm;

      const targetEntity = cds.model.definitions[associationTarget];

      const elements = req.target.elements;
      const associationName = Object.entries(elements)
        .filter(([key, def]) => def.target === associationTarget)
        .map(([key]) => key);

      // req.target.elements[aName].foreignKeys
      const keys = {};
      for (const key in targetEntity.keys) {
        keys[key] = req.data[associationName[0] + '_' + key];
      }

      let replica = await db.exists(targetEntity, keys);
      if (!replica) {
        replica = await remoteService.read(targetEntity, keys);
        await INSERT.into(targetEntity).entries(replica);
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

module.exports = {
  readDelegation,
  demandReplication,
  updateReplicationOnEvent
};
