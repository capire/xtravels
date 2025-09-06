using { sap, sap.capire.travels as our } from '../db/schema';

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

  // Also expose Flights and Currencies for travel booking UIs and Value Helps
  @readonly entity Flights as projection on sap.capire.travels.masterdata.Flights;
  @readonly entity Currencies as projection on sap.common.Currencies;

  // Export functions to export download travel data
  function exportCSV() returns LargeBinary @Core.MediaType: 'text/csv' @Core.ContentDisposition.Filename: 'Travels.csv' @Core.ContentDisposition.Type: 'attachment';
  function exportJSON() returns LargeBinary @Core.MediaType: 'application/json' @Core.ContentDisposition.Filename: 'Travels.json' @Core.ContentDisposition.Type: 'attachment';
}

type Percentage : Integer @assert.range: [1,100];
