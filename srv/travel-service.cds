using { FlightsService } from '@capire/sflights';
using { sap } from '../db/schema';

service TravelService {

  @(restrict: [
    { grant: 'READ', to: 'authenticated-user'},
    { grant: ['rejectTravel','acceptTravel','deductDiscount'], to: 'reviewer'},
    { grant: ['*'], to: 'processor'},
    { grant: ['*'], to: 'admin'}
  ])
  entity Travels as projection on sap.capire.travels.Travels actions {
    action createTravelByTemplate() returns Travels;
    action rejectTravel();
    action acceptTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  }

  entity Flights as projection on FlightsService.Flights { *,
    connection.airline as airline,
    connection.code as flightNumber,
    connection.departure as departure,
    connection.destination as destination,
  }
  entity Airports as projection on FlightsService.Airports;
  entity Airline as projection on FlightsService.Airlines;
}

type Percentage : Integer @assert.range: [1,100];
