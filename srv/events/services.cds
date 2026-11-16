using { sap.capire.events as my } from './db/schema';
namespace sap.capire.events;

/**
 * Conference and corporate-event lookup and pass-booking service —
 * find events like SAP Sapphire, TechEd, DKOM and book attendee passes.
 */
@agent @mcp @hcql service EventsService {

  @readonly entity Events as projection on my.Events
  excluding { availableTickets };

  /** Book one or more passes for an event — returns the created booking's ID and total price. */
  action bookTicket(
    eventId : UUID,
    guest   : String,
    seats   : Integer
  ) returns {
    ID: UUID;
    totalPrice: Decimal;
    currency: Events:currency.code;
  };

  /** Cancel an event-pass booking by booking ID. */
  action cancelTicket(
    bookingId : UUID
  );
}

// Late-cut µ service. Allows us to run the events service
// embedded in xtravels, or as a standalone micro service.
// annotate EventsService with @cds.external:2;
