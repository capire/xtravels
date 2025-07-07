namespace sap.capire.travels.masterdata;
using { sap.capire.flights.data as external } from '@capire/sflights';

//
// Consumption views for 2b federated master data...
//

entity federated.Flights as projection on external.Flights {
  *,
  airline.icon     as icon,
  airline.name     as airline,
  departure.name   as departure,
  destination.name as destination,
}

entity federated.Supplements as projection on external.Supplements {
  ID, type, descr, price, currency
}


//
// Direct references to external master data
//

type Currency : Association to external.Currencies;
type Country : Association to external.Countries;


//
// Common types for Travels application
//

type Price : Decimal(16, 3);
