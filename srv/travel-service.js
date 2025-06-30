const cds = require('@sap/cds')
module.exports = class TravelService extends cds.ApplicationService { init() {

  // Reflected definitions from the service's CDS model
  const { Travels, Bookings, Supplements } = this.entities
  const { Open='O', Accepted='A', Canceled='X' } = {}

  // Fill in alternative keys as consecutive numbers for new Travels, Bookings, and Supplements.
  // Note: For Travels that can't be done at NEW events, that is when drafts are created,
  // but on CREATE only, as multiple users could create new Travels concurrently.
  this.before ('CREATE', Travels, async req => {
    let { maxID } = await SELECT.one (`max(TravelID) as maxID`) .from (Travels)
    req.data.TravelID = ++maxID
  })

  // Prevent changing closed travels -> should be automated by Status-Transition Flows
  this.before ('NEW', Bookings.drafts, async req => {
    let { status } = await SELECT `Status_code as status` .from (Travels.drafts, req.data.to_Travel_ID)
    if (status === Canceled) return req.reject (400, 'Cannot add new bookings to rejected travels.')
  })

  // Fill in IDs as sequence numbers -> could be automated by auto-generation
  this.before ('NEW', Bookings.drafts, async req => {
    let { maxID } = await SELECT.one (`max(BookingID) as maxID`) .from (Bookings.drafts) .where (req.data)
    req.data.BookingID = ++maxID
  })

  // Fill in IDs as sequence numbers -> should be automated by auto-generation
  this.before ('NEW', Supplements.drafts, async req => {
    let { maxID } = await SELECT.one (`max(BookingSupplementID) as maxID`) .from (Supplements.drafts) .where (req.data)
    req.data.BookingSupplementID = ++maxID
  })

  // Ensure BeginDate is not after EndDate -> would be automated by Dynamic Validations
  this.before ('SAVE', Travels, req => { // REVISIT: should also work for Travel.drafts instead of Travel, but doesn't (?)
    const { BeginDate, EndDate } = req.data
    if (BeginDate > EndDate) req.error (400, `End Date must be after Begin Date.`, 'in/EndDate') // REVISIT: in/ should go away!
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
    const travel = req.target === Travels.drafts ? req.data.ID : ( await SELECT.one `Travel.ID as ID` .from (req.subject) ).ID
    await next() // actually UPDATE or DELETE the subject entity
    await cds.run(`UPDATE ${Travels.drafts} SET TotalPrice = coalesce (BookingFee,0)
     + ( SELECT coalesce (sum(FlightPrice),0) from ${Bookings.drafts} where Travel_ID = ID )
     + ( SELECT coalesce (sum(Price),0) from ${Supplements.drafts} where Booking_Travel_ID = ID )
    WHERE ID = ?`, [travel])
  }


  //
  // Action Implementations...
  //

  const { acceptTravel, rejectTravel, deductDiscount } = Travels.actions

  this.on (acceptTravel, async req => UPDATE (req.subject) .with ({ Status_code: Accepted }))
  this.on (rejectTravel, async req => UPDATE (req.subject) .with ({ Status_code: Canceled }))
  this.on (deductDiscount, async req => {
    let discount = req.data.percent / 100
    let succeeded = await UPDATE (req.subject) .where ({ Status: Open, BookingFee: {'!=':null} })
      .with `BookingFee = round (BookingFee - BookingFee * ${discount}, 3)`
      .with `TotalPrice = round (TotalPrice - BookingFee * ${discount}, 3)`

    if (!succeeded) { //> let's find out why...
      let travel = await SELECT.one `TravelID as id, Status.code as status, BookingFee` .from (req.subject)
      if (!travel) throw req.reject (404, `Travel "${travel.id}" does not exist; may have been deleted meanwhile.`)
      if (travel.status === Accepted) throw req.reject (409, `Travel "${travel.id}" has been approved already.`)
      if (travel.BookingFee == null) throw req.reject (404, `No discount possible, "${travel.id}" does not yet have a booking fee added.`)
    }
  })

  // Add base class's handlers. Handlers registered above go first.
  return super.init()

}}
