const cds = require('@sap/cds')

// Prepare Flights and Supplements for data replication
cds.on ('loaded', csn => {
  const {
    'sap.capire.flights.Flights': Flights,
    'sap.capire.flights.Supplements': Supplements
  } = csn.definitions
  Flights['@cds.persistence.table'] = true
  Supplements['@cds.persistence.table'] = true
})

// Initial load remote data when server starts
cds.once ('served', async () => {
  const srv = await cds.connect.to ('sap.capire.flights.data')
  const { Flights, Supplements } = cds.entities ('sap.capire.flights')
  const [ flights, supplements ] = await Promise.all([
    srv.read (Flights),
    srv.read (Supplements)
  ])
  await Promise.all ([
    cds.insert(flights).into(Flights),
    cds.insert(supplements).into(Supplements)
  ])
  cds.log('xtravels').info (`\n
    Loaded ${flights.length} Flights and ${supplements.length} Supplements 
    from xflights data service.
  `)
})
