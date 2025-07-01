using { sap.capire.travels as my } from './schema';

annotate my.Travels with {
  @mandatory BeginDate;
  @mandatory EndDate;
  @mandatory Agency;
  @mandatory Customer;
}

annotate my.Bookings with {
  @mandatory Flight;
  @mandatory Travel;
}

annotate my.Supplements with {
  @mandatory Supplement;
}


annotate my.Travels with @Capabilities.FilterRestrictions.FilterExpressionRestrictions: [
  { Property: 'BeginDate', AllowedExpressions : 'SingleRange' },
  { Property: 'EndDate', AllowedExpressions : 'SingleRange' }
];
