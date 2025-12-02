using { TravelService } from './travel-service';


annotate TravelService.Travels with {

  Description @assert: (case 
    when length(Description) < 3 then 'Description too short' 
  end);

  Agency @mandatory;

  Customer @mandatory;
  // Customer @assert.target; 
  // Customer @assert: (case 
  Customer @assert: (case 
    when Customer is null then 'Customer must be specified' 
    when not exists Customer then 'Customer does not exist' 
  end);

  BeginDate @mandatory @assert: (case 
    when EndDate < BeginDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
    // when Bookings.Flight.date < BeginDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
    // when exists Bookings [Flight.date < $self.BeginDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);

  EndDate @mandatory @assert: (case 
    when EndDate < BeginDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
    // when Bookings.Flight.date > EndDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
    // when exists Bookings [Flight.date > $self.EndDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);

  BookingFee @assert: (case 
    when BookingFee < 0 then 'Booking fee cannot be negative' 
  end);

};



// REVISIT: We want to annotate the TravelService.Bookings here, which is not exposed.
// So we create a projection entity as an ugly WORKAROUND here to be able to annotate it.
using { sap.capire.travels.Bookings } from './travel-service';
entity TravelService.Bookings as projection on Bookings;


annotate TravelService.Bookings with {

  Travel @mandatory;
  Flight @mandatory;

  // Flight @assert: (case 
  Pos @assert: (case 
    when Flight.date not between Travel.BeginDate and Travel.EndDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);

  // Currency @assert: (case 
  FlightPrice @assert: (case 
    when FlightPrice < 0 then 'ASSERT_FLIGHT_PRICE_POSITIVE' 
    when Currency != Travel.Currency then 'ASSERT_BOOKING_CURRENCY_MATCHES_TRAVEL'
  end);

  BookingDate @assert: (case 
    when BookingDate > Travel.EndDate then 'ASSERT_NO_BOOKINGS_AFTER_TRAVEL'
  end);
};


// REVISIT: What is that doing here? And why is it needed?
annotate TravelService.Travels with @Capabilities.FilterRestrictions.FilterExpressionRestrictions: [
  { Property: 'BeginDate', AllowedExpressions : 'SingleRange' },
  { Property: 'EndDate', AllowedExpressions : 'SingleRange' }
];
