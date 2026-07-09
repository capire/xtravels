using { sap.capire.travels as our, sap } from '../db/schema';
using { sap.capire.xflights as x } from '../apis/capire/xflights';
using { sap.capire.s4 } from '../apis/capire/s4';

@ws @odata service TravelService {
  // @ws: { currentUser, format: 'pcp', pcp: { sideEffect } }
  event priceChanged {
    sideEffectSource: String;
  }

  entity Travels as projection on our.Travels actions {
    action deductDiscount( percent: Percentage not null );
    action acceptTravel();
    action rejectTravel();
    action reopenTravel();
  }

  // Also expose related entities as read-only projections
  @readonly entity TravelAgencies as projection on our.TravelAgencies;
  @readonly entity Currencies as projection on sap.common.Currencies;
  @readonly entity Customers as projection on s4.Customers;
  @readonly entity Flights as projection on x.Flights;
  @readonly entity Supplements as projection on x.Supplements;

}

// Custom type for percentage values
type Percentage : Integer @assert.range: [1,100];
