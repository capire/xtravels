namespace sap.capire.hotels;

using { cuid, managed } from '@sap/cds/common';

/** Hotels available for booking */
entity Hotels : cuid {
  /** Hotel name */
  name            : String(200);

  /** City where the hotel is located */
  city            : String(100);

  /** Country where the hotel is located */
  country         : String(100);

  /** Star rating (1-5) */
  stars           : Integer;

  /** Price per night in USD */
  pricePerNight   : Decimal(10,2);

  /** Number of rooms currently available */
  availableRooms  : Integer;

  /** Comma-separated list of amenities */
  amenities       : String(500);
}

/** Hotel booking records */
entity Bookings : cuid, managed {
  /** Reference to the booked hotel */
  hotel           : Association to Hotels;

  /** Guest name */
  guest           : String(200);

  /** Check-in date */
  checkIn         : Date;

  /** Check-out date */
  checkOut        : Date;

  /** Number of rooms booked */
  rooms           : Integer default 1;

  /** Booking status */
  status          : String enum { confirmed; cancelled } default 'confirmed';

  /** Total price for the stay */
  totalPrice      : Decimal(10,2);
}
