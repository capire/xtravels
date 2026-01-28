using { sap.capire.flights.data as external } from '@capire/xflights-data';
namespace sap.capire.xflights;

/**
 * Consumption view declaring the subset of fields we actually want to use 
 * from the external Flights entity, with associations like airline, origin, 
 * destination flattened (aka denormalized).
 */
@federated entity Flights as projection on external.Flights {
  ID, date, departure, arrival, modifiedAt,
  airline.icon     as icon @UI.IsImageURL,
  airline.name     as airline,
  origin.name      as origin,
  destination.name as destination,
}

/**
 * Consumption view declaring the subset of fields we actually want to use 
 * from the external Supplements entity.
 */
@federated entity Supplements as projection on external.Supplements {
  ID, type, descr, price, currency, modifiedAt
}
