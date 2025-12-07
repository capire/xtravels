using { TravelService } from './travel-service';



annotate TravelService.Travels with {

  Description @assert: (case 
    when length(Description) < 3 then 'Description too short' 
  end);

  Agency @mandatory @assert: (case 
    when not exists Agency then 'Agency does not exist' 
  end);

  Customer @assert: (case 
    when Customer is null then 'Customer must be specified' 
    when not exists Customer then 'Customer does not exist' 
  end);

  BeginDate @mandatory @assert: (case 
    when EndDate < BeginDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
    when exists Bookings [Flight.date < Travel.BeginDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
    // when Bookings.Flight.date < BeginDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD' 
    // The above works as well, but de-normalization of to-many assiciations, like Bookings, 
    // leads to duplicate messages reported.
  end);

  EndDate @mandatory @assert: (case 
    when EndDate < BeginDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
    when exists Bookings [Flight.date > Travel.EndDate] then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
    // when Bookings.Flight.date > EndDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);

  BookingFee @assert: (case 
    when BookingFee < 0 then 'ASSERT_BOOKING_FEE_NON_NEGATIVE' 
  end);

}



annotate TravelService.Bookings with {

  Travel @mandatory;
  Flight @mandatory { 
    date @assert: (case 
      when date not between $self.Travel.BeginDate and $self.Travel.EndDate then 'ASSERT_BOOKING_IN_TRAVEL_PERIOD'
    end);
  };

  FlightPrice @assert: (case 
    when FlightPrice < 0 then 'ASSERT_FLIGHT_PRICE_POSITIVE' 
  end);

  Currency @assert: (case 
    when Currency != Travel.Currency then 'ASSERT_BOOKING_CURRENCY_MATCHES_TRAVEL'
  end);

  BookingDate @assert: (case 
    when BookingDate > Travel.EndDate then 'ASSERT_NO_BOOKINGS_AFTER_TRAVEL'
  end);

}
