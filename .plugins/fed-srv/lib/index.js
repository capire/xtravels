const cds = require('@sap/cds');
const LOG = cds.log("cds-df");

const registerFederationHandler = require('./registerEventHandlers');
const utils = require('./utils');

cds.on('loaded', model => {
    const remoteServices = utils.getAllRemoteServices(model);

    for (const name in model.definitions) {
        const def = model.definitions[name];

        if (def.kind === 'entity') {
            // Add @cds.persistence.table annotation to root entity (== target is remote service)   
            // REVISIT: def.query -> is always undefined
            const target = def.projection?.from?.ref?.[0];
            if (!target) continue
            const isTargetRemote = remoteServices.some(srv => target.indexOf(srv) === 0)
            if (isTargetRemote) {
                def['@cds.replicate'] = true;
                def['@cds.persistence.table'] = true;
            }
            // REVISIT: what is our expectation for what entities to actually handle
            // const isTargetRemote = target && model.definitions[target]['@cds.external'] === 2;
            // if (def['@cds.replicate'] && isTargetRemote) {
            //     def['@cds.persistence.table'] = true;
            // }
        }
    }
});

cds.on('serving', srv => {
    const model = cds.model.definitions;
    const remoteServices = utils.getAllRemoteServices(cds.model);

    if (remoteServices.length === 0) {
        return;
    }

    const collectionObject = Object.fromEntries(remoteServices.map(srv => [srv, []]));

    for (const entity of srv.entities) {
        // Check directly exposed entities annotated with @replicated
        if (entity['@cds.replicate']) {
            const remoteTargetEntity = utils.getRemoteTargetEntity(entity);
            const remoteSrvName = utils.getServiceNameFromEntity(remoteTargetEntity);

            if (remoteServices.includes(remoteSrvName)) {
                utils.updateCollectionObject(collectionObject, remoteSrvName, entity.name, remoteTargetEntity);
            }
        }

        // Check associations to remote services interface with @replicated
        if (!entity.associations) continue;

        for (const assoc of entity.associations) {
            const assocTarget = model[assoc.target];

            if (assocTarget && assocTarget['@cds.replicate']) {
                const remoteTargetEntity = utils.getRemoteTargetEntity(assocTarget);
                const remoteSrvName = utils.getServiceNameFromEntity(remoteTargetEntity);

                if (remoteServices.includes(remoteSrvName)) {
                    utils.updateCollectionObject(collectionObject, remoteSrvName, assocTarget.name, remoteTargetEntity, entity.name);
                }
            }
        }
    }

    // Register Event Handlers
    for (const rs in collectionObject) {
        const allEntries = collectionObject[rs];

        // Read for exposed entities with @cds.replicate
        const allExposedEntities = Object.values(allEntries).map(e => e.localEntity).filter(e => ([e in srv.entities]));
        LOG.info(`Register handler for read delegation Service: ${rs}, Entities: ${allExposedEntities}`);
        registerFederationHandler.readDelegation(srv, rs, allExposedEntities);

        // Demand Replication for entities with associations to @cds.replicate
        const allAssociations = allEntries.filter(e => e.association.length > 0);
        for (const a of allAssociations) {
            LOG.info(`Register handler for demand replication Service: ${rs}, Entities: ${a.association}`);
            registerFederationHandler.demandReplication(srv, rs, a.localEntity, a.association);
        }

        // Update Replication on Event for exposed entities with @cds.replicate
        const rsDef = cds.services[rs];
        for (const event in rsDef.events) {
            const eventDef = rsDef.events[event];
            const targetEntityName = Object.getPrototypeOf(eventDef).name;

            Object.values(allEntries).filter(e => e.remoteEntity === targetEntityName).forEach(async e => {
                LOG.info(`Register handler for update replication Event: ${event}, Service: ${rs}, Entity: ${e.replicatedEntity}`);
                await registerFederationHandler.updateReplicationOnEvent(rs, eventDef, e.localEntity);
            });
        }
    }
});
