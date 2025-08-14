const cds = require('@sap/cds');

// Function to get all external services
function getAllRemoteServices(model) {
  const services = Object.keys(model.definitions).filter(name => model.definitions[name]?.kind === 'service');
  return services.filter(srv => {
    const creds = cds.requires[srv]?.credentials
    // RemoteService only functions if the url or destination credentials are provided
    return model.definitions[srv]['@cds.external'] && (creds?.url || creds?.destination)
  });
}

function searchRemoteQuery(target, srvNameToFind, previousQuery = null) {
  const srvName = getServiceNameFromEntity(target);
  if (srvName === srvNameToFind) {
    return previousQuery;
  }
  if (target.query && target.query._target) {
    return searchRemoteQuery(target.query._target, srvNameToFind, target.query);
  } else {
    return null;
  }
}

function mapAndFilterKeysToEntityModel(remoteSrv, entityName, keys) {
  const entity = cds.model.definitions[entityName];
  const entityKeys = Object.getOwnPropertyNames(entity.keys);

  const query = searchRemoteQuery(entity, remoteSrv);

  for (const key in keys) {
    const matchingCol = query.SELECT.columns.find(col => col.ref[0] === key);
    if (matchingCol && entityKeys.includes(matchingCol.as)) {
      const value = keys[key];
      delete keys[key];
      keys[matchingCol.as] = value;
    } else {
      delete keys[key]; // Delete the entry if it doesn't match any entity keys
    }
  }
  return keys;
}

function getServiceNameFromEntity(entity) {
  return entity['_service'] ? entity._service.name : null;
}

function searchRemoteTargetEntity(target) {
  if (target.hasOwnProperty('@cds.external')) return target;
  if (target.query && target.query._target) {
    return searchRemoteTargetEntity(target.query._target, target.query);
  } else {
    return null;
  }
}

function getRemoteTargetEntity(def) {
  const targetDBTable = cds.ql.resolve.table(def);
  const remoteTargetEntity = !targetDBTable['@cds.external'] ? targetDBTable.query._target : searchRemoteTargetEntity(def.query._target);

  return remoteTargetEntity;
}

function getRemoteDBTable(def) {
  const targetDBTable = cds.ql.resolve.table(def);
  if (targetDBTable.query && targetDBTable.query._target) {
    return getRemoteDBTable(targetDBTable.query._target);
  }
  return targetDBTable.name;
}

function isTargetRemote(def) {
  if (def.hasOwnProperty('@cds.external')) return true;
  if (def.query && def.query._target) {
    return isTargetRemote(def.query._target);
  }
  return false;
}

function isCrossBoundary(association, baseEntity) {
  const baseEntityDef = cds.model.definitions[baseEntity];
  const targetEntityDef = cds.model.definitions[association.target];

  if (!targetEntityDef) return false;

  const isBaseRemote = utils.isTargetRemote(baseEntityDef);
  const isTargetRemote = utils.isTargetRemote(targetEntityDef);

  return isBaseRemote !== isTargetRemote; // Cross-boundary if different
}

function addToMap(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

module.exports = {
  getAllRemoteServices,
  mapAndFilterKeysToEntityModel,
  getRemoteTargetEntity,
  getServiceNameFromEntity,
  isTargetRemote,
  getRemoteDBTable,
  addToMap
};