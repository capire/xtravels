using { sap.capire.s4 } from '../../apis/capire/s4';
namespace sap.capire.travels;

/**
 * Travel planning agent that coordinates hotel bookings, conference event
 * passes, and flight reservations across multiple destinations. Lives in
 * the same process as the xtravels Fiori app, so it can persist confirmed
 * itineraries directly into the local Travels DB via createTravel.
 */
@mcp service TravelAgentService {

  /** Allows to fetch customer IDs by name */
  @readonly entity Customers as projection on s4.Customers {
    ID, Name as name
  }

  /**
   * Persist a confirmed travel itinerary (header + flight bookings) into the
   * XTravels app so the trip shows up in the Fiori UI.
   * Call this only AFTER the user has approved a complete plan.
   * Returns the newly created Travel's ID and calculated BeginDate and EndDate.
   */
  @requires: 'authenticated-user'
  action createTravel (

    /**
     * Customer ID — SAP Business Partner number. Numeric zero-padded string (e.g. "000430").
     * Query the Customers entity to find the ID for a given customer name.
     */
    Customer_ID : Customers:ID @mandatory,

    /**
     * Free-text trip description, e.g. "Weekend in Paris".
     */
    Description : String  @mandatory,

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
