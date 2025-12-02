using { sap, sap.capire.travels as db } from '../db/schema';

service FooService {
  @readonly entity BookingDates as projection on db.Bookings {
    BookingDate
  };
}