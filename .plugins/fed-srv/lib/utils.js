const cds = require('@sap/cds');
const resolveView = require('@sap/cds/libx/_runtime/common/utils/resolveView');

// Function to get all external services
function getAllRemoteServices(model) {
  const services = Object.keys(model.definitions).filter(name => model.definitions[name]?.kind === 'service');
  return services.filter(srv => {
    const creds = cds.requires[srv]?.credentials
    // RemoteService only functions if the url or destination credentials are provided
    return model.definitions[srv]['@cds.external'] && (creds?.url || creds?.destination)
      && (!cds.services[srv] || cds.services[srv] instanceof cds.RemoteService)
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

function getRemoteTargetEntity(definition) {
  const localTargetEntity = resolveView.getDBTable(definition);
  const remoteTargetEntity = localTargetEntity.query._target;

  return remoteTargetEntity;
}

function updateCollectionObject(collObj, remoteSrvName, localEntityName, remoteEntity, association = null) {
  const newEntry = {
    localEntity: localEntityName,
    remoteEntity: resolveView.getDBTable(remoteEntity).name,
    association: association ? [association] : []
  }

  const existingEntry = collObj[remoteSrvName].find(entry =>
    entry.localEntity === newEntry.localEntity
  );

  if (existingEntry) {
    if (association) {
      existingEntry.association = [...new Set([...existingEntry.association, association])];
    }
  } else {
    collObj[remoteSrvName].push(newEntry);
  }
}

module.exports = {
  getAllRemoteServices,
  mapAndFilterKeysToEntityModel,
  getRemoteTargetEntity,
  getServiceNameFromEntity,
  updateCollectionObject
};