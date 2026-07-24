const cds = require('@sap/cds')

module.exports = class TravelAgentService extends cds.ApplicationService {
  async init() {

    /**
     * Connect to the TravelService, which is used to create Travels.
     */
    const TravelService = await cds.connect.to ('TravelService')

    /**
     * Handle the "createTravel" action. It calculates the trip's start and end dates
     * based on the flight dates, and then creates the travel via the TravelService.
     */
    this.on ('createTravel', async (req) => {
      let { Bookings} = req.data
      let BeginDate = Bookings?.at(0)?.Flight_date || today()
      let EndDate = Bookings?.at(-1)?.Flight_date || today()
      let [{ID}] = await TravelService.create ('Travels', {
        Agency_ID:'070666', BeginDate, EndDate, ...req.data,
        Bookings: Bookings.map((b,i) => ({ ...b, Pos:i+1 }))
      })
      return { ID, BeginDate, EndDate }
    })

    // Call the base class's init() method to complete the service initialization.
    return super.init()
  }
}


/** Helper function to get today's date in YYYY-MM-DD format. */
const today = () => new Date().toISOString().slice(0,10)
