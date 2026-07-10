namespace sap.capire.events;

using { cuid, managed } from '@sap/cds/common';

/** Conferences and corporate events that travelers can attend */
entity Events : cuid {
  /** Event short name, e.g. "SAP Sapphire 2027" */
  name            : String(200);

  /** City where the event is hosted */
  city            : String(100);

  /** Country where the event is hosted */
  country         : String(100);

  /** Specific venue (helps choose a nearby hotel) */
  venue           : String(200);

  /** First day of the event (YYYY-MM-DD) */
  startDate       : Date;

  /** Last day of the event (YYYY-MM-DD) */
  endDate         : Date;

  /** Marketing description / one-liner */
  description     : String(1000);

  /** Price per attendee pass in USD */
  passPrice       : Decimal(10,2);

  /** Number of passes still available */
  availablePasses : Integer;
}

/** Event-pass / conference-ticket booking records */
entity Bookings : cuid, managed {
  event           : Association to Events;
  guest           : String(200);
  seats           : Integer default 1;
  status          : String enum { confirmed; cancelled } default 'confirmed';
  totalPrice      : Decimal(10,2);
}
