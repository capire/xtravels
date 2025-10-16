const cds = require('@sap/cds')
module.exports = class TravelService extends cds.ApplicationService { async init() {

  // Reflected definitions from the service's CDS model
  const { Flights, Travels, Bookings, 'Bookings.Supplements': Supplements } = this.entities
  const { Open='O', Accepted='A', Canceled='X' } = {}

  // Fill in alternative keys as consecutive numbers for new Travels, Bookings, and Supplements.
  // Note: For Travels that can't be done at NEW events, that is when drafts are created,
  // but on CREATE only, as multiple users could create new Travels concurrently.
  this.before ('CREATE', Travels, async req => {
    let { maxID } = await SELECT.one (`max(ID) as maxID`) .from (Travels)
    req.data.ID = ++maxID
  })

  // Prevent changing closed travels -> should be automated by Status-Transition Flows
  this.before ('NEW', Bookings.drafts, async req => {
    let { status } = await SELECT `Status_code as status` .from (Travels.drafts, req.data.to_Travel_ID)
    if (status === Canceled) return req.reject (400, 'Cannot add new bookings to rejected travels.')
  })

  // Fill in IDs as sequence numbers -> could be automated by auto-generation
  this.before ('NEW', Bookings.drafts, async req => {
    let { maxID } = await SELECT.one (`max(Pos) as maxID`) .from (Bookings.drafts) .where (req.data)
    req.data.Pos = ++maxID
  })

  // Ensure BeginDate is not after EndDate -> would be automated by Dynamic Validations
  this.before ('SAVE', Travels, req => {
    const { BeginDate, EndDate } = req.data
    if (BeginDate > EndDate) req.error (400, `End Date must be after Begin Date.`, 'in/EndDate') // REVISIT: in/ should go away!
  })

  const FlightsService = await cds.connect.to ('sap.capire.flights.data') //.then (cds.enqueued)

  this.after ('SAVE', Travels, async travel => {
    for (let { flightNumber, flightDate } of travel.Bookings)
      await FlightsService.send ('BookingCreated', {
        flightNumber,
        flightDate,
        seats: [ 0 ] // no seat numbers managed in sample
      })
  })

  FlightsService.on ('Flights.Updated', async msg => {
    const { flightNumber, flightDate, occupiedSeats } = msg.data
    await UPDATE (Flights, { flightNumber, flightDate }) .with ({ occupiedSeats })
  })


  // Update a Travel's TotalPrice whenever its BookingFee is modified,
  // or when a nested Booking is deleted or its FlightPrice is modified,
  // or when a nested Supplement is deleted or its Price is modified.
  // -> should be automated by Calculated Elements + auto-GROUP BY
  this.on ('PATCH', Travels.drafts,      (req, next) => update_totals (req, next, 'BookingFee', 'GoGreen'))
  this.on ('PATCH', Bookings.drafts,     (req, next) => update_totals (req, next, 'FlightPrice'))
  this.on ('PATCH', Supplements.drafts, (req, next) => update_totals (req, next, 'Price'))
  this.on ('DELETE', Bookings.drafts,     (req, next) => update_totals (req, next))
  this.on ('DELETE', Supplements.drafts, (req, next) => update_totals (req, next))
  // Note: Using .on handlers as we need to read a Booking's or Supplement's ID before they are deleted.
  async function update_totals (req, next, ...fields) {
    if (fields.length && !fields.some(f => f in req.data)) return next() //> skip if no relevant data changed
    await next() // actually UPDATE or DELETE the subject entity
    await cds.run(`UPDATE ${Travels.drafts} as t SET TotalPrice = coalesce (BookingFee,0)
     + ( SELECT coalesce (sum(FlightPrice),0) from ${Bookings.drafts} where Travel_ID = t.ID )
     + ( SELECT coalesce (sum(Price),0) from ${Supplements.drafts} where up__Travel_ID = t.ID )
    WHERE ID = ?`, [
      req.target === Travels.drafts ? req.data.ID :
      req.target === Bookings.drafts ? ( await SELECT.one `Travel_ID as ID` .from (req.subject) ).ID :
      req.target === Supplements.drafts ? ( await SELECT.one `up__Travel_ID as ID` .from (req.subject) ).ID : null
    ])
  }


  //
  // Action Implementations...
  //

  const { acceptTravel, rejectTravel, deductDiscount } = Travels.actions

  this.before([acceptTravel, rejectTravel], [Travels, Travels.drafts], async req => {
    const existingDraft = await SELECT.one(Travels.drafts.name).where(req.params[0])
      .columns(travel => { travel.DraftAdministrativeData.InProcessByUser.as('InProcessByUser') } )
    // action called on active -> reject if draft exists
    // action called on draft -> reject if not own draft
    const isDraft = req.target.name.endsWith('.drafts')
    if (!isDraft && existingDraft || isDraft && existingDraft?.InProcessByUser !== req.user.id)
      throw req.reject(423, `The travel is locked by ${existingDraft.InProcessByUser}.`);
  })
  this.on (acceptTravel, [Travels, Travels.drafts], async req => UPDATE (req.subject) .with ({ Status_code: Accepted }))
  this.on (rejectTravel, [Travels, Travels.drafts], async req => UPDATE (req.subject) .with ({ Status_code: Canceled }))
  this.on (deductDiscount, async req => {
    let discount = req.data.percent / 100
    let succeeded = await UPDATE (req.subject) .where ({ Status: Open, BookingFee: {'!=':null} })
      .with `BookingFee = round (BookingFee - BookingFee * ${discount}, 3)`
      .with `TotalPrice = round (TotalPrice - BookingFee * ${discount}, 3)`

    if (!succeeded) { //> let's find out why...
      let travel = await SELECT.one `ID, Status.code as status, BookingFee` .from (req.subject)
      if (!travel) throw req.reject (404, `Travel "${travel.ID}" does not exist; may have been deleted meanwhile.`)
      if (travel.status === Accepted) throw req.reject (409, `Travel "${travel.ID}" has been approved already.`)
      if (travel.BookingFee == null) throw req.reject (404, `No discount possible, "${travel.ID}" does not yet have a booking fee added.`)
    }
  })


  const { TravelsExport } = this.model.definitions
  const { Readable } = require ('stream')

  this.on ('exportCSV', req => {
    let query = cds.ql (TravelsExport.query)
    let stream = Readable.from (async function*() {
      yield Object.keys(query.elements).join(';') + '\n'
      for await (const row of query.localized)
        yield Object.values(row).join(';') + '\n'
    }())
    return req.reply (stream, { filename: 'Travels.csv' })
  })

  this.on ('exportJSON', async req => {
    let query = cds.ql (TravelsExport.query)
    let stream = await query.localized.stream()
    return req.reply (stream, { filename: 'Travels.json' })
  })

  // Add base class's handlers. Handlers registered above go first.
  return super.init()

}}


// Temporary monkey patch until upcoming release of @sap/cds...
SELECT.class.prototype.stream ??= SELECT.class.prototype.pipeline
