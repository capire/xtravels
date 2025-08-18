const cds = require('@sap/cds');
const log = cds.log('srv-federation');

const registerHandler = require('./lib/registerEventHandlers');
const utils = require('./lib/utils');

let replicationSetups = {};

cds.on('loaded', model => {

    const remotes = []
    for (let each in cds.requires) {
        if (cds.requires[each]?.credentials) remotes.push (each)
    }

    const federations = []
    for (let entity in model.definitions) {
        const d = model.definitions[entity]; if (!d['@federated']) continue
        const target = d.projection?.from?.ref?.[0]; if (!target) continue
        const srv = remotes.find (r => target.startsWith(r)); if (!srv) continue
        federations.push ({ remote:srv, entity })
        d['@cds.persistence.table'] = true
        d['@cds.persistence.skip'] = false // REVISIT: workaround for a glitch in cqn4sql: @cds.persistence.table has precedence over @cds.persistence.skip
    }

    if (federations.length > 0) cds.once('served', async ()=> {
        for (let { remote, entity } of federations) {
            const srv = await cds.connect.to (remote)
            const initial = await srv.read (entity) // @Bob: can we stream this?
            await INSERT.into (entity) .entries (initial)
        }
    })

})


cds.on('serving', srv => {
    const model = cds.model.definitions;
    const remoteServices = utils.getAllRemoteServices(cds.model);
    if (remoteServices.length === 0) return;

    // Strategy collections
    const conditionalRead = [];
    const readDelegationMap = new Map();
    const expandMap = new Map();
    const navigationTargets = new Set();
    const initialLoadEntities = [];
    const replicationPairs = [];

    // Process all entities and associations
    for (const entity of srv.entities) {
        handleEntity(entity);
        handleAssociations(entity);
    }
    registerHandlers();

    function handleEntity(entity) {
        if (!utils.isTargetRemote(entity)) return;

        const targetEntity = utils.getRemoteTargetEntity(entity);
        const remoteSrvName = utils.getServiceNameFromEntity(targetEntity);

        if (!remoteServices.includes(remoteSrvName)) return;

        // check inital load flag
        const creds = cds.requires[remoteSrvName]?.credentials || {};
        const initialLoadFlag = creds.loadOnDemand !== true;

        if (entity['@cds.replicate'] || entity['@cds.replicate.ttl']) {
            if (initialLoadFlag) {
                initialLoadEntities.push({ remoteSrvName, entity: entity.name });
            } else {
                conditionalRead.push(entity.name);
                utils.addToMap(readDelegationMap, remoteSrvName, entity.name);
            }
        } else {
            utils.addToMap(readDelegationMap, remoteSrvName, entity.name);
        }
    }

    // REVISIT: Traverse nested associations
    function handleAssociations(entity) {
        if (!entity.associations) return;

        for (const assoc of entity.associations) {
            const assocTarget = model[assoc.target];
            if (!assocTarget) continue;

            const isEntityRemote = utils.isTargetRemote(entity);
            const isTargetRemote = utils.isTargetRemote(assocTarget);

            if (!isEntityRemote && isTargetRemote) {
                const remoteTargetEntity = utils.getRemoteTargetEntity(assocTarget);
                const remoteSrvName = utils.getServiceNameFromEntity(remoteTargetEntity);

                if (!remoteServices.includes(remoteSrvName)) continue;

                if (assocTarget['@cds.replicate'] || entity['@cds.replicate.ttl']) {
                    replicationPairs.push({ remoteSrvName, localEntity: entity.name, remoteEntity: assocTarget.name });
                    initialLoadEntities.push({ remoteSrvName, entity: assocTarget.name });
                } else {
                    utils.addToMap(readDelegationMap, remoteSrvName, assocTarget.name);
                }
                addExpandNavigation(entity.name, assocTarget.name);
            } else if (isEntityRemote && !isTargetRemote) {
                addExpandNavigation(entity.name, assocTarget.name);
            }
        }
    }

    function addExpandNavigation(entity, target) {
        if (!expandMap.has(entity)) expandMap.set(entity, new Set());
        expandMap.get(entity).add(target);
        navigationTargets.add(target);
    }

    function registerHandlers() {
        // Register readDelegation handlers for external entities
        for (const [remoteSrvName, entities] of readDelegationMap.entries()) {
            registerHandler.readDelegation(srv, remoteSrvName, Array.from(entities));
        }

        // Register conditionalReadDelegation for external entities (on-demand replication)
        if (conditionalRead.length > 0) {
            registerHandler.conditionalReadDelegation(srv, conditionalRead);
        }

        // Register initial load event listeners (initial replication)
        replicationSetups = {};
        for (const { remoteSrvName, entity } of initialLoadEntities) {
            if (!replicationSetups[remoteSrvName]) replicationSetups[remoteSrvName] = [];

            replicationSetups[remoteSrvName].push(entity);
            registerHandler.eventListenerForReplication(srv, remoteSrvName, entity);
        }

        // Register expand and navigation handlers
        for (const [expandTarget, expandEntities] of expandMap.entries()) {
            registerHandler.expand(srv, expandTarget, Array.from(expandEntities));
        }
        for (const navTarget of navigationTargets) {
            registerHandler.navigation(srv, navTarget);
        }

        // Register demand replication and update replication on event
        for (const { remoteSrvName, localEntity, remoteEntity } of replicationPairs) {
            registerHandler.demandReplication(srv, remoteSrvName, localEntity, remoteEntity);

            const remoteEvents = cds.services[remoteSrvName].events;
            if (!remoteEvents) continue;

            for (const event of remoteEvents) {
                const targetEntityName = Object.getPrototypeOf(event).name;
                if (utils.getRemoteDBTable(model[remoteEntity]) === targetEntityName) {
                    log.info(`Register handler for update replication Event: ${event}, Service: ${remoteSrvName}, Entity: ${remoteEntity}`);
                    registerHandler.updateReplicationOnEvent(remoteSrvName, event, remoteEntity);
                }
            }
        }
    }
});

cds.on('listening', async ({ server, url }) => {
    for (const [remoteSrvName, entities] of Object.entries(replicationSetups)) {
        // Find the application service that needs replication
        const appService = Object.values(cds.services).find(srv =>
            srv.name && entities.some(entity =>
                Object.keys(srv.entities || {}).includes(entity.split('.').pop())
            )
        );

        if (!appService) continue;

        // scheduling for each replication entity
        for (const entity of entities) {
            const eventName = `replicate_${entity}`;
            const entityDef = cds.model.definitions[entity];
            const ttl = entityDef['@cds.replicate.ttl'];

            const creds = cds.requires[remoteSrvName]?.credentials || {};
            const initialLoadFlag = creds.loadOnDemand !== true;

            try {
                if (ttl) {
                    await appService.schedule(eventName).every(ttl);
                    log.info(`Scheduled recurring replication for ${entity} every ${ttl}`);
                } else if (initialLoadFlag) {
                    await appService.schedule(eventName);
                    log.info(`Scheduled initial load for ${entity}`);
                }
            } catch (error) {
                log.error(`Failed to schedule replication for ${entity}:`, error);
            }
        }
    }
});