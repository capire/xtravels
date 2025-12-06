using { sap, sap.capire.travels as db } from '../db/schema';

service TravelService {

  @(restrict: [
    { grant: 'READ', to: 'authenticated-user'},
    { grant: ['rejectTravel','acceptTravel','deductDiscount'], to: 'reviewer'},
    { grant: ['*'], to: 'processor'},
    { grant: ['*'], to: 'admin'}
  ])
  entity Travels as projection on db.Travels actions {
    action createTravelByTemplate() returns Travels;
    action rejectTravel();
    action acceptTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  }

  // Define flow for Travels
  // NOTE: @flow.status on entity-level makes the target element read-only
  annotate Travels with @flow.status: Status actions {
    rejectTravel    @from: #Open  @to: #Canceled;
    acceptTravel    @from: #Open  @to: #Accepted;
    deductDiscount  @from: #Open;
  };

  // Also expose Flights and Currencies for travel booking UIs and Value Helps
  @readonly entity Flights as projection on db.masterdata.Flights;
  @readonly entity Supplements as projection on db.masterdata.Supplements;
  @readonly entity Currencies as projection on sap.common.Currencies;

  // Export functions to export download travel data
  function exportJSON() returns LargeBinary @Core.MediaType:'application/json';
  function exportCSV() returns LargeBinary @Core.MediaType:'text/csv';

  /**
   * Edit this view to control which data to include in CSV/JSON exports
   */
  @cds.api.ignore                 // don't expose as OData entity
  @cds.persistence.skip           // don't create view in database
  @cds.redirection.target: false  // don't use as redirection target
  entity TravelsExport as projection on db.Travels {
    ID,
    Agency.Name as Agency,
    concat(Customer.Title, ' ', Customer.FirstName, ' ', Customer.LastName) as Customer : String, 
    BeginDate,
    EndDate,
    TotalPrice,
    Currency.code as Currency,
    Status.name as Status,
    Description
  }

}

type Percentage : Integer @assert.range: [1,100];
