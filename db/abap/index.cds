using { sap.capire.travels.masterdata.federated.Supplements } from '../master-data';

// It is not possible to define type association as a managed association
// because the rap sflight model doesn't match expected default foreign key pattern
// therefor it is required to explicitly expose the foreign key onto the projections
extend projection Supplements with {
  type_code
};
