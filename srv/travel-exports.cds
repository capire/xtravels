using { TravelService, sap.capire.travels as db } from './travel-service';

extend service TravelService with {

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
    Customer.Name as Customer,
    BeginDate,
    EndDate,
    TotalPrice,
    Currency.code as Currency,
    Status.name as Status,
    Description
  }

}
