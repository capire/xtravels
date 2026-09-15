import cds from "@sap/cds"

export default class EventsService extends cds.ApplicationService {
  async init() {
    const { Events, Bookings } = this.entities

    this.on("bookTicket", async (req) => {
      const { eventId, guest, seats = 1 } = req.data

      if (!eventId || !guest) {
        return req.reject(
          400,
          "Missing required fields: eventId and guest are required.",
        )
      }
      if (seats < 1) {
        return req.reject(400, "seats must be at least 1.")
      }

      const event = await SELECT.one.from(Events).where({ ID: eventId })
      if (!event) return req.reject(404, `Event with ID "${eventId}" not found.`)

      if (event.availableTickets < seats) {
        return req.reject(
          409,
          `Sorry, "${event.name}" only has ${event.availableTickets} passes available. You requested ${seats}.`,
        )
      }

      const totalPrice = Number(event.price) * seats
      const [{ID}] = await INSERT.into(Bookings).entries({
        event_ID: event.ID,
        guest,
        seats,
        status: "confirmed",
        totalPrice,
      })
      await UPDATE (Events, event.ID) .with ({ availableTickets: { "-=": seats } })

      return { ID, totalPrice }
    })


    this.on("cancelTicket", async (req) => {
      const { bookingId } = req.data
      if (!bookingId) return req.reject(400, "Please provide a booking ID to cancel.")

      const booking = await SELECT.one.from(Bookings).where({ ID: bookingId })
      if (!booking) return req.reject(404, `Booking with ID "${bookingId}" not found.`)
      if (booking.status === "cancelled") return req.reject(409, "This booking is already cancelled.")

      await UPDATE (Events, booking.event_ID) .set({ availableTickets: { "+=": booking.seats } })
      await UPDATE (Bookings, bookingId) .with ({ status: "cancelled" })
    })


    await super.init()
  }
}
