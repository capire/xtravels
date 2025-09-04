// Simple data federation / replication example

const cds = require ('@sap/cds')
const log = cds.log ('cds.data')

cds.on ('loaded', csn => {

  const remote = 'sap.capire.flights.data'
  if (!cds.requires[remote]?.credentials?.url) return

  // Turn consumption views into persistence replica tables
  for (let each of [ 'Flights', 'Supplements' ]) {
    const entity = csn.definitions ['sap.capire.travels.masterdata.' + each]
    entity['@cds.persistence.table'] = true
    entity['@cds.persistence.skip'] = false
  }

  // Replicate data from external flight service into local replica tables
  cds.once ('served', async () => {
    const xflights = await cds.connect.to (remote)
    for (let each of [ 'Flights', 'Supplements' ]) {
      const rows = await xflights.read (each = 'sap.capire.travels.masterdata.' + each)
      await INSERT.into(each).entries(rows)
      log.info ('initially loaded:', { entity: each, from: remote, via: xflights.kind })
    }
  })

})
