const PROD = process.env.NODE_ENV === 'production' /* eslint-disable no-console */
const cds = require ('@sap/cds')
const feed = []

// Collect all entities to be federated, and prepare replica tables
PROD || cds.on ('loaded', csn => {
  for (let e of cds.linked(csn).entities) {
    if (e['@federated']) {
      let srv = remote_srv4(e)
      if (is_remote(srv)) {
        e['@cds.persistence.table'] = true //> turn into table for replicas
        feed.push ({ entity: e.name, remote: srv })
      }
    }
  }
})
  
// Setup and schedule replications for all collected entities
PROD || cds.once ('served', () => Promise.all (feed.map (async each => {
  const srv = await cds.connect.to (each.remote)
  srv._once ??=!! srv.on ('replicate', replicate)
  await srv.schedule ('replicate', each) .every ('10 minutes')
})))

// Event handler for replicating single entities
async function replicate (req) { 
  let { entity } = req.data, remote = this
  let { latest } = await SELECT.one `max(modifiedAt) as latest` .from (entity)
  let rows = await remote.read (entity) .where `modifiedAt > ${latest||0}` 
  if (rows.length) await UPSERT (rows) .into (entity); else return
  console.log ('Replicated', rows.length, 'entries', { for: entity, via: this.kind })
}

// Helpers to identify remote services, and check whether they are connected
const remote_srv4 = entity => entity.__proto__._service?.name
const is_remote = srv => cds.requires[srv]?.credentials?.url
