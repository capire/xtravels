using { 
  TravelService.Travels, 
  sap.capire.travels.Bookings 
  // REVISIT: ^^^^^^ We'd want to annotate the contained TravelServce.Bookings here, 
  // but as that is not exposed, it is not possible. So we annotate the db.Bookings 
  // as a workaround instead, which will lead to problemes if we have multiple, 
  // different projections of db.Bookings in different services.
} from './travel-service';


annotate Travels with {
  @mandatory BeginDate;
  @mandatory EndDate;
  @mandatory Agency;
  @mandatory Customer;
}

annotate Bookings with {
  @mandatory Flight;
  @mandatory Travel;
}


annotate Travels with @constraints: (case 
  // when BeginDate > EndDate then error('ASSERT_ENDDATE_AFTER_BEGINDATE', null, ('EndDate', 'BeginDate')) 
  when BeginDate > EndDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
  when Bookings.Flight.date not between BeginDate and EndDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  when Bookings.Flight.date not between BeginDate and EndDate then error (
    'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD', null, ('Bookings.{row index}.Flight.date')
  )
  when exists Bookings [Flight.date < $self.BeginDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
end);

annotate Travels with {

  BeginDate @assert: (case 
    // when EndDate < BeginDate then 'End date must be after begin date' 
    when EndDate < BeginDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
    when Bookings.Flight.date < BeginDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
    // when Bookings.Flight.date == BeginDate 
    //   then error('ASSERT_BOOKINGS_IN_TRAVEL_PERIOD', null, ('Bookings.{Bookings.Pos}.Flight.date'))
    // // when exists Bookings [Flight.date < $self.BeginDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);

  EndDate @assert: (case 
    // when EndDate < BeginDate then 'End date must be after begin date' 
    when EndDate < BeginDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
    when Bookings.Flight.date > EndDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
    // when exists Bookings [Flight.date > $self.EndDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);
};

// REVISIT: Doesn't work 
// annotate Bookings with {

//   FlightPrice @assert: (case // REVISIT: wrong field, but Flight.date not accessible here
//     when Flight.date not between Travel.BeginDate and Travel.EndDate 
//     then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
//   end);

// };


// REVISIT: What is that doing here? And why is it needed?
annotate Travels with @Capabilities.FilterRestrictions.FilterExpressionRestrictions: [
  { Property: 'BeginDate', AllowedExpressions : 'SingleRange' },
  { Property: 'EndDate', AllowedExpressions : 'SingleRange' }
];
