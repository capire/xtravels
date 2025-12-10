using { sap, sap.capire.travels as db, sap.capire.xflights as dbx } from '../db/schema';

service TravelService {

  entity Travels as projection on db.Travels actions {
    action createTravelByTemplate() returns Travels;
    action acceptTravel();
    action rejectTravel();
    action reopenTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  }

  // Also expose Flights and Currencies for travel booking UIs and Value Helps
  @readonly entity Flights as projection on dbx.Flights;
  @readonly entity Supplements as projection on dbx.Supplements;
  @readonly entity Currencies as projection on sap.common.Currencies;

}

// Custom type for percentage values
type Percentage : Integer @assert.range: [1,100];
