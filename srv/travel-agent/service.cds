using { sap.capire.s4 } from '../../apis/capire/s4';

/**
 * Travel planning agent that coordinates hotel bookings, conference event
 * passes, and flight reservations across multiple destinations. Lives in
 * the same process as the xtravels Fiori app, so it can persist confirmed
 * itineraries directly into the local Travels DB via createTravel.
 */
@mcp service TravelAgentService {

  @readonly entity Customers as projection on s4.Customers;

  /**
   * Persist a confirmed travel itinerary (header + flight bookings) into the
   * xtravels TravelService DB so the trip shows up in the Fiori UI.
   * Call this AFTER the user has approved a complete plan.
   * Returns the new Travel ID and Description.
   */
  @UI.IsActionCritical
  action createTravel(

    /**
     * Free-text trip description, e.g. "Weekend in Paris".
     */
    Description : String  @mandatory,

    /**
     * Customer ID — SAP Business Partner number. Numeric string, max 10
     * characters (e.g. "0000000093"). Do NOT pass a person's name; query
     * the Customers entity to find the ID for a given name first.
     */
    Customer_ID : String  @mandatory,

    /**
     * Booking fee for the whole trip; defaults to 0 if omitted.
     */
    BookingFee : Decimal,

    /**
     * ISO 4217 currency code; defaults to 'EUR' if omitted.
     */
    Currency_code : String,

    /**
     * Flight bookings to attach to the trip; must be non-empty.
     * The trip's BeginDate / EndDate are derived server-side as
     * `[min(FlightDate) - 1 day, max(FlightDate) + 1 day]`, so just pass the
     * actual flight dates and don't worry about the trip period.
     */
    Bookings : many {

      /**
       * Flight ID, e.g. "SW0001".
       */
      Flight_ID : String;

      /**
       * Date of the flight (YYYY-MM-DD); must fall within the trip period.
       */
      Flight_date : Date;

      /**
       * Price for this flight in the booking's currency.
       */
      FlightPrice : Decimal;

      /**
       * ISO 4217 currency code for this flight.
       */
      Currency_code : String;
    }

  ) returns {
    ID          : Integer;
    BeginDate   : Date;
    EndDate     : Date;
  };
}
