namespace sap.capire.travels.masterdata;
using { sap.capire.flights.data as external } from '@capire/xflights';

//
// Consumption views for master data imported from xflights...
//

@federated entity Flights as projection on external.Flights {
  *,
  airline.icon     as icon,
  airline.name     as airline,
  origin.name      as origin,
  destination.name as destination,
}

@federated entity Supplements as projection on external.Supplements {
  ID, type, descr, price, currency
}
