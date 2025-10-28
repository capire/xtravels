using { sap, sap.capire.travels as db } from '../db/schema';

service TravelService {

  @(restrict: [
    { grant: 'READ', to: 'authenticated-user'},
    { grant: ['rejectTravel','acceptTravel','deductDiscount'], to: 'reviewer'},
    { grant: ['*'], to: 'processor'},
    { grant: ['*'], to: 'admin'}
  ])
  entity Travels as projection on db.Travels
  // TODO: how to exclude transitions_ automatically?
  // excluding { transitions_ } 
  actions {
    action createTravelByTemplate() returns Travels;
    action rejectTravel();
    action acceptTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  }

  // TODO: is it a problem to add @flow.status here but FlowHistory in db?
  annotate Travels with @flow.status: status actions {
    NEW           /* @from: [ null ]   */          @to: /* #Draft */ #Open;
    SAVE          /* @from: [ #Draft ] */          @to: #Open;
    cancel        @from: [ #Open ]                 @to: #Cancelled;
    rejectTravel  @from: [ #Open ]                 @to: #Rejected;
    acceptTravel  @from: [ #Open ]                 @to: #Approved;
    close         @from: [ #Approved ]             @to: #Closed;
    EDIT          @from: [ #Approved, #Rejected ]  @to: /* #Draft */ #Open;
  };

  // Also expose Flights and Currencies for travel booking UIs and Value Helps
  @readonly entity Flights as projection on db.masterdata.Flights;
  @readonly entity Supplements as projection on db.masterdata.Supplements;
  @readonly entity Currencies as projection on sap.common.Currencies;

  // Export functions to export download travel data
  function exportJSON() returns LargeBinary @Core.MediaType:'application/json';
  function exportCSV() returns LargeBinary @Core.MediaType:'text/csv';

}


/**
 * Edit this view to control which data to include in CSV/JSON exports
 */
entity TravelsExport @cds.persistence.skip as projection on db.Travels {
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
