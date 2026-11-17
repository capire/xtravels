const assert = require('node:assert/strict')
const { before, beforeEach, after, test } = require('node:test')
const cds = require('@sap/cds')
const { TravelService } = require('../srv/travel-service/service')
const { SELECT, INSERT, UPDATE } = cds.ql
let service, tenantModel

before(async () => {
  const model = await cds.load('*')
  await cds.deploy(model).to('sqlite::memory:')
  cds.model = cds.db.model
  service = new TravelService('TravelService', cds.model)
  service.update_totals()
  // Extended tenant requests use separate compiled entity definitions.
  tenantModel = cds.compile.for.nodejs(JSON.parse(JSON.stringify(model)))
  const { Travels, Bookings, 'Bookings.Supplements': Supplements } = service.entities
  const draft = { DraftAdministrativeData_DraftUUID: '00000000-0000-0000-0000-000000000002' }
  await INSERT.into(Travels.drafts).entries({ ...draft, ID: 900001, BookingFee: 20, TotalPrice: 150 })
  await INSERT.into(Bookings.drafts).entries({ ...draft, Travel_ID: 900001, Pos: 1, FlightPrice: 100 })
  await INSERT.into(Supplements.drafts).entries({
    ...draft,
    ID: '00000000-0000-0000-0000-000000000001',
    up__Travel_ID: 900001, up__Pos: 1, Price: 30
  })
})

beforeEach(async () => {
  const { Travels, Bookings, 'Bookings.Supplements': Supplements } = service.entities
  await UPDATE(Travels.drafts).where({ ID: 900001 }).with({ BookingFee: 20, TotalPrice: 150 })
  await UPDATE(Bookings.drafts).where({ Travel_ID: 900001, Pos: 1 }).with({ FlightPrice: 100 })
  await UPDATE(Supplements.drafts).where({ ID: '00000000-0000-0000-0000-000000000001' }).with({ Price: 30 })
})

after(async () => {
  await cds.db?.disconnect()
})

for (const [entity, keys, data, total] of [
  ['Bookings', { Travel_ID: 900001, Pos: 1 }, { FlightPrice: 200 }, 250],
  ['Bookings.Supplements', { ID: '00000000-0000-0000-0000-000000000001' }, { Price: 40 }, 160],
  ['Travels', { ID: 900001 }, { BookingFee: 25 }, 155]
]) {
  test(entity + ' draft edit recalculates totals with a separate tenant model', async () => {
    const baseTarget = service.entities[entity].drafts
    const target = tenantModel.definitions['TravelService.' + entity].drafts
    assert.equal(target.name, baseTarget.name)
    assert.notEqual(target, baseTarget)
    const subject = SELECT.one.from(target).where(keys).SELECT.from
    const req = { event: 'UPDATE', target, path: target.name, subject, data: { ...keys, ...data } }
    const handler = service.handlers.on.find(h => h.for(req))
    assert.ok(handler)
    await handler.handler(req, () => cds.db.run(UPDATE(target).where(keys).with(data)))
    const travel = await SELECT.one.from(service.entities.Travels.drafts).where({ ID: 900001 })
    assert.equal(Number(travel.TotalPrice), total)
  })
}
