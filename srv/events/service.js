import cds from "@sap/cds"

export default class EventService extends cds.ApplicationService {
  async init() {
    const { Events, Bookings } = this.entities

    this.on("bookEventPass", async (req) => {
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

      if (event.availablePasses < seats) {
        return req.reject(
          409,
          `Sorry, "${event.name}" only has ${event.availablePasses} passes available. You requested ${seats}.`,
        )
      }

      const totalPrice = Number(event.passPrice) * seats

      const booking = {
        event_ID: event.ID,
        guest,
        seats,
        status: "confirmed",
        totalPrice,
      }

      const [result] = await INSERT.into(Bookings).entries(booking)
      await UPDATE(Events)
        .set({ availablePasses: { "-=": seats } })
        .where({ ID: event.ID })

      return SELECT.one.from(Bookings).where({ ID: result.ID })
    })

    this.on("cancelEventPass", async (req) => {
      const { bookingId } = req.data
      if (!bookingId) return req.reject(400, "Please provide a booking ID to cancel.")

      const booking = await SELECT.one.from(Bookings).where({ ID: bookingId })
      if (!booking) return req.reject(404, `Booking with ID "${bookingId}" not found.`)
      if (booking.status === "cancelled")
        return req.reject(409, "This booking is already cancelled.")

      await UPDATE(Bookings).set({ status: "cancelled" }).where({ ID: bookingId })
      await UPDATE(Events)
        .set({ availablePasses: { "+=": booking.seats } })
        .where({ ID: booking.event_ID })

      return SELECT.one.from(Bookings).where({ ID: bookingId })
    })

    await super.init()
  }
}
