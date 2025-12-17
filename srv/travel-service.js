const cds = require ('@sap/cds')

class TravelService extends cds.ApplicationService { 

  async init() {
    this.service_integration()
    this.generate_primary_keys()
    this.deduct_discounts()
    this.update_totals()
    this.status_flows()
    this.data_export()
    return super.init()
  }


  /**
   * Integrates with the XFlights service to keep Flights data in sync on both sides.
   */
  async service_integration() {

    const xflights = await cds.connect.to ('sap.capire.flights.data') .then (cds.outboxed)
    const { Flights, Travels } = this.entities

    // Update local Flights data whenever occupied seats change in XFlights
    xflights.on ('Flights.Updated', async msg => {
      const { flightNumber, flightDate, occupiedSeats } = msg.data
      await UPDATE (Flights, { flightNumber, flightDate }) .with ({ occupiedSeats })
    })    

    // Inform XFlights about new bookings, so it can update occupied seats
    this.after ('SAVE', Travels, ({ Bookings=[] }) => Promise.all (
      Bookings.map (({ flightNumber, flightDate }) => xflights .send ('BookingCreated', {
        flightNumber, flightDate
      })
    )))
  }


  /**
   * Generate primary keys for new Travels and Bookings.
   */
  generate_primary_keys() {

    const { Travels, Bookings } = this.entities
    
    const ensureIncrementalTravelId = async (req) => {
      const { maxID } = await SELECT.one (`max(ID) as maxID`) .from (Travels) || { maxID: 0 }
      const { maxDraftID } = (await SELECT.one (`max(ID) as maxDraftID`) .from (Travels.drafts)) || { maxDraftID: 0 }
      const newID = (maxDraftID > maxID ? maxDraftID : maxID) + 1
      req.data.ID = newID
    }

    this.before ('NEW', Travels.drafts, req => ensureIncrementalTravelId(req))

    this.before ('CREATE', Travels, req => !req.data.ID && ensureIncrementalTravelId(req))

    this.before ('NEW', Bookings.drafts, async (req) => { // on NEW as Bookings are per draft, so no concurrency issues
      let { id } = await SELECT.one `max(Pos) as id` .from (Bookings.drafts) .where (req.data)
      req.data.Pos = ++id
    })
  }


  /**
   * Deduct discounts from Travels' BookingFee and TotalPrice.
   */
  deduct_discounts() {

    const { Open } = this.StatusCodes
    const { Travels } = this.entities
    const { deductDiscount } = Travels.actions

    this.on (deductDiscount, async req => {
      let discount = req.data.percent / 100
      let succeeded = await UPDATE (req.subject) 
        .set `BookingFee = round (BookingFee - BookingFee * ${discount}, 3)`
        .set `TotalPrice = round (TotalPrice - BookingFee * ${discount}, 3)`
        .where `BookingFee is not null` // only travels with specified booking fee
        .where `Status.code = ${Open}` // only open travels => implicit constraints check
      if (!succeeded) return failed (req)
    })

    async function failed (req) { // find out what caused the failure...
      let { ID, status, fee } = await SELECT.one `ID, Status.code as status, BookingFee as fee` .from (req.subject) || {}
      if (!ID) throw req.reject (404, `Travel "${ID}" does not exist; may have been deleted meanwhile.`)
      if (!fee) throw req.reject (404, `No discount possible, "${ID}" does not yet have a booking fee added.`)
      if (status !== Open) throw req.reject (409, `Cannot deduct discount from travel "${ID}" as it is not open.`)
    }
  }


  /**
   * Recalculate Travels' TotalPrice field, whenever...
   * 
   * - its BookingFee is modified,
   * - a nested Booking is deleted or its FlightPrice is modified,
   * - a nested Supplement is deleted or its Price is modified.
   * 
   * Implemented via direct SQL UPDATE for efficiency.
   */
  update_totals() {

    const { Travels, Bookings, 'Bookings.Supplements': Supplements } = this.entities
    const UpdateTotals = // Native SQL UPDATE statement, prepared once, and reused subsequently
    `UPDATE ${Travels.drafts} as t SET TotalPrice = coalesce (BookingFee,0)
      + ( SELECT coalesce (sum(FlightPrice),0) from ${Bookings.drafts} where Travel_ID = t.ID )
      + ( SELECT coalesce (sum(Price),0) from ${Supplements.drafts} where up__Travel_ID = t.ID )
    WHERE ID = ?`

    this.on ('PATCH',  Travels.drafts,     (..._) => update_totals (..._, 'BookingFee', 'GoGreen'))
    this.on ('PATCH',  Bookings.drafts,    (..._) => update_totals (..._, 'FlightPrice'))
    this.on ('PATCH',  Supplements.drafts, (..._) => update_totals (..._, 'Price'))
    this.on ('DELETE', Bookings.drafts,    (..._) => update_totals (..._, 'ID'))
    this.on ('DELETE', Supplements.drafts, (..._) => update_totals (..._, 'ID'))

    async function update_totals (req, next, ...fields) {
      // Exit early if no relevant data changed
      if (!fields.some (field => field in req.data)) return next() 
      // First execute the actual update or delete, so we can recalculate totals in the database afterwards
      await next() 
      // Run the total price recalculation in the database, using the travel from the request target
      const { ID: TravelID } =
        req.target === Supplements.drafts ? await SELECT.one `up_.Travel.ID as ID` .from (req.subject) :
        req.target === Bookings.drafts ? await SELECT.one `Travel.ID as ID` .from (req.subject) :
        req.target === Travels.drafts ? req.data : cds.error (`No travel found for ${req.subject}`)
      await cds.run (UpdateTotals, [TravelID])
    }
  }


  /**
   * Enforce custom constraints on status flows.
   * Should increasingly be automated by generic Status Flows feature.
   */
  status_flows() {

    const { Travels, Bookings } = this.entities
    const { acceptTravel, rejectTravel } = Travels.actions 
    const { Open } = this.StatusCodes

    // Prevent adding bookings to non-open travels
    this.before ('NEW', Bookings.drafts, async (req) => {
      let { status } = await SELECT `Status_code as status`.from (Travels.drafts, req.data.to_Travel_ID)
      if (status !== Open) req.reject (409, `Cannot add new bookings to travels which are not open.`)
    })

    // Prevent accepting or rejecting travels that are locked by existings drafts
    this.before ([ acceptTravel, rejectTravel ], [ Travels, Travels.drafts ], async req => {
      const draft = await SELECT.one (Travels.drafts, req.params[0]) 
        .columns `DraftAdministrativeData.InProcessByUser as owner`
      if (!draft || draft.owner === req.user.id && req.target.isDraft) return //> ok
      else req.reject (423, `The travel is locked by ${draft.owner}.`)
    })
  }


  /**
   * Export Travels data in CSV and JSON formats.
   */
  data_export() {

    const { Travels, TravelsExport } = this.entities
    const { exportCSV, exportJSON } = this.actions 
    const { Readable } = require ('stream')

    this.on (exportCSV, async req => {
      let query = SELECT.localized (TravelsExport.projection) .from (Travels) 
      let stream = Readable.from (async function*() {
        yield Object.keys(query.elements).join(';') + '\n'
        for await (const row of query)
          yield Object.values(row).join(';') + '\n'
      }())
      return req.reply (stream, { filename: 'Travels.csv' })
    })

    this.on (exportJSON, async req => {
      let query = SELECT.localized (TravelsExport.projection) .from (Travels) 
      let stream = await query.stream()
      return req.reply (stream, { filename: 'Travels.json' })
    })
  }


  /**
   * Derives constants for status codes from enum definitions in CDS.
   */
  get StatusCodes() {
    const { TravelStatus } = this.entities, { code } = TravelStatus.elements
    return super.StatusCodes = Object.fromEntries (Object.entries (code.enum)
      .map (([ k, v ]) => [ k, v.val ])
    )
  }

}

module.exports = { TravelService }
