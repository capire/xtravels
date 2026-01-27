const PROD = process.env.NODE_ENV === 'production' /* eslint-disable no-console */
const cds = require ('@sap/cds')
const feed = []

// Collect all entities to be federated, and prepare replica tables
PROD || cds.on ('loaded', csn => {
  for (let each of cds.linked(csn).entities) if (each['@federated']) {
    let srv = each.query && each.__proto__._service; if (!srv) continue
    if (!cds.requires[srv.name]?.credentials?.url) continue
    each['@cds.persistence.table'] = true //> table for replicas
    feed.push ({ entity: each.name, remote: srv.name })
  }
})
  
// Setup and schedule replications for all collected entities
PROD || cds.once ('served', () => Promise.all (feed.map (async each => {
  const srv = await cds.connect.to (each.remote)
  await srv.schedule ('replicate', each) .every ('3 seconds')
  srv.replicate ??=!! srv.on ('replicate', replicate_entity)
})))

// Event handler for replicating single entities
async function replicate_entity (req) { 
  let { entity } = req.data
  let { since } = await SELECT.one `max(modifiedAt) as since` .from (entity)
  let rows = await this.read (entity) .where `modifiedAt > ${since||0}` 
  if (rows.length) await UPSERT (rows) .into (entity); else return
  console.log ('Replicated', rows.length, 'entries for:', { entity })
}
