import cds from "@sap/cds"

export default class HotelsService extends cds.ApplicationService {
  async init() {
    const { Hotels, Bookings } = this.entities

    this.on("bookHotel", async (req) => {
      const { hotelId, guest, checkIn, checkOut, rooms = 1 } = req.data

      if (!hotelId || !guest || !checkIn || !checkOut)
        return req.reject(400, "Missing required fields: hotelId, guest, checkIn, and checkOut are all required.")

      if (checkIn >= checkOut)
        return req.reject(400, "Check-out date must be after check-in date.")

      const hotel = await SELECT.one.from (Hotels, hotelId)
      if (!hotel)
        return req.reject(404, `Hotel with ID "${hotelId}" not found.`)

      if (hotel.availableRooms < rooms)
        return req.reject(409, `Sorry, ${hotel.name} only has ${hotel.availableRooms} rooms available. You requested ${rooms}.`)

      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
      const totalPrice = nights * hotel.pricePerNight * rooms

      const [{ID}] = await INSERT.into(Bookings).entries({
        hotel_ID: hotel.ID,
        guest,
        checkIn,
        checkOut,
        rooms,
        totalPrice,
        status: "confirmed",
      })
      await UPDATE(Hotels, hotel.ID) .with ({ availableRooms: { "-=": rooms } })

      return { ID, totalPrice }
    })


    this.on("cancelBooking", async (req) => {
      const { bookingId } = req.data
      if (!bookingId) return req.reject(400, "Please provide a booking ID to cancel.")

      const booking = await SELECT.one.from (Bookings, bookingId)
      if (!booking) return req.reject(404, `Booking with ID "${bookingId}" not found.`)
      if (booking.status === "cancelled")
        return req.reject(409, "This booking is already cancelled.")

      await UPDATE (Bookings, bookingId) .with ({ status: "cancelled" })
      await UPDATE (Hotels, booking.hotel_ID) .with ({ availableRooms: { "+=": booking.rooms } })
    })


    await super.init()
  }
}
