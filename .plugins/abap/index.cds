using { sap, sap.common.CodeList } from '@sap/cds/common';
using { rap_v2 as my } from './srv/external/rap-v2';

@odata @rest @hcql @data.product
service sap.capire.flights.data {

  // Serve Flights data with inlined connection details
  entity Flights as projection on my.Flight {
    key ConnectionID as ID,
    to_Connection.{
      AirlineID as airline_ID,
      DepartureAirport as origin_ID,
      DestinationAirport as destination_ID,
      DepartureTime as departure,
      ArrivalTime as arrival,
      Distance as distance,
      to_DepartureAirport as origin: redirected to Airlines
        on $self.origin.ID = $self.origin_ID,
      to_DestinationAirport as destination: redirected to Airlines
        on $self.destination.ID = $self.destination_ID,
    },
    key FlightDate as date, // preserve the flight date as a key
    PlaneType as aircraft,
    Price as price,    CurrencyCode as currency_code,
    MaximumSeats as maximum_seats,
    OccupiedSeats as occupied_seats,
    MaximumSeats - OccupiedSeats as free_seats: Integer,
    to_Airline as airline: redirected to Airlines on $self.airline_ID = airline.ID,
    to_Connection as flight,
  };

  // Serve Airlines, Airports, and Supplements data as is
  entity Airlines as projection on my.Airline {
    key AirlineID as ID,
    null as icon: LargeBinary,
    Name as name,
    CurrencyCode as currency_code,
  };
  entity Airports as projection on my.Airport {
    AirportID as ID,
    Name as name,
    City as city,
    CountryCode as country_code,
  };
  entity Supplements as select from my.Supplement mixin {
    type: Association to SupplementTypes on SupplementCategory = type.code;
  } into {
    key SupplementID as ID,
    type,
    SupplementCategory as type_code,
    to_SupplementText[where LanguageCode = session_context('$user.locale')].Description as descr,
    Price as price,
    to_Currency as currency,
    CurrencyCode as currency_code,
  };

  entity SupplementTypes : CodeList {
    key code : String(2) enum {
      Beverage = 'BV';
      Meal = 'ML';
      Luggage = 'LU';
      Extra = 'EX';
    }
  }

  // Serve data for common entities from @sap/cds/common
  entity Currencies as projection on sap.common.Currencies;
  entity Countries as projection on sap.common.Countries;
  entity Languages as projection on sap.common.Languages;

}
