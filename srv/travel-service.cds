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
  function exportJSON() returns LargeBinary @Core.MediaType:'application/json';
  function exportCSV() returns LargeBinary @Core.MediaType:'text/csv';
}


/**
 * Edit this view to control which data to include in CSV/JSON exports
 */
entity TravelsExport @cds.persistence.skip as projection on sap.capire.travels.Travels {
  ID,
  Agency.Name as Agency,
  concat(Customer.Title, ' ', Customer.FirstName, ' ', Customer.LastName) as Customer,
  BeginDate,
  EndDate,
  TotalPrice,
  Currency.code as Currency,
  Status.name as Status,
  Description
}

type Percentage : Integer @assert.range: [1,100];
