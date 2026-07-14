using { sap.capire.events as my } from './db/schema';

/**
 * Conference and corporate-event lookup and pass-booking service —
 * find events like SAP Sapphire, TechEd, DKOM and book attendee passes.
 */
@mcp service EventService {

  entity Events as projection on my.Events;
  entity Bookings as projection on my.Bookings;

  /** Book one or more passes for an event — returns the confirmed booking record. */
  action bookEventPass(
    eventId : UUID,
    guest   : String,
    seats   : Integer
  ) returns Bookings;

  /** Cancel an event-pass booking by booking ID. */
  action cancelEventPass(
    bookingId : UUID
  ) returns Bookings;
}
