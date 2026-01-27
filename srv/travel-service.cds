using { sap, sap.capire.travels as our, sap.capire.xflights, sap.capire.s4 } from '../db/schema';

@fiori service TravelService {

  entity Travels as projection on our.Travels actions {
    action createTravelByTemplate() returns Travels;
    action acceptTravel();
    action rejectTravel();
    action reopenTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  }

  // Also expose related entities as read-only projections
  @readonly entity TravelAgencies as projection on our.TravelAgencies;
  @readonly entity Currencies as projection on sap.common.Currencies;
  @readonly entity Customers as projection on s4.Customers;
  @readonly entity Flights as projection on xflights.Flights;
  @readonly entity Supplements as projection on xflights.Supplements;

}

// Custom type for percentage values
type Percentage : Integer @assert.range: [1,100];
