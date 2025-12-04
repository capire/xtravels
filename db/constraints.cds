using { sap.capire.travels as my } from './schema';

annotate my.Travels with {
  @mandatory BeginDate;
  @mandatory EndDate;
  @mandatory Agency;
  @mandatory Customer;
  @assert: (case 
    when BeginDate > EndDate then 'End Date must be after Begin Date.' 
    end )
  EndDate;
  @assert: (case 
    when BookingFee < 0 then 'Booking Fee must be non-negative.'
    end )
  BookingFee;
  }

annotate my.Bookings with {
  @mandatory Flight;
  @mandatory Travel;
}

annotate my.Travels with @Capabilities.FilterRestrictions.FilterExpressionRestrictions: [
  { Property: 'BeginDate', AllowedExpressions : 'SingleRange' },
  { Property: 'EndDate', AllowedExpressions : 'SingleRange' }
];
