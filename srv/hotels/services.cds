using { sap.capire.hotels as my } from './db/schema';

/**
 * Hotel search and booking service.
 * Allows finding hotels by city, price, or star rating and making reservations.
 */
@agent
@mcp service HotelsService {

  entity Hotels as projection on my.Hotels;
  entity Bookings as projection on my.Bookings;

  /** Book a hotel room for a guest — returns the confirmed booking record */
  action bookHotel(
    hotelId  : UUID,
    guest    : String,
    checkIn  : Date,
    checkOut : Date,
    rooms    : Integer
  ) returns Bookings;

  /** Cancel a hotel booking by booking ID */
  action cancelBooking(
    bookingId : UUID
  ) returns Bookings;
}
