const cds = require('@sap/cds')

cds.on ('loaded', csn => {
  const {
    'sap.capire.travels.masterdata.Flights': Flights,
    'sap.capire.travels.masterdata.Supplements': Supplements
  } = csn.definitions
  Flights['@cds.persistence.table'] = true
  Supplements['@cds.persistence.table'] = true
})

cds.once ('served', () => {
  const { TravelService } = cds.services

  TravelService.on ('initial-load', async () => {
    const srv = await cds.connect.to ('sap.capire.flights.data')
    const { Flights, Supplements } = cds.entities `sap.capire.travels.masterdata`
    const [ flights, supplements ] = await Promise.all([
      srv.read (Flights),
      srv.read (Supplements)
    ])
    await Promise.all ([
      cds.insert(flights).into(Flights),
      cds.insert(supplements).into(Supplements)
    ])
    cds.log('server').info (`
      Loaded ${flights.length} Flights and ${supplements.length} 
      Supplements from sap.capire.flights.data
    `)
  })

  return TravelService.schedule('initial-load',{ foo:11 }) .after ('1 second')
})
