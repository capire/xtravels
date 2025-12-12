using { TravelService, sap.capire.travels as db } from '../srv/travel-service';

annotate TravelService.Travels with @constraints: (case 
  when Customer is null then 'Customer must be specified'
  when not exists Customer then 'Customer does not exist'
  when BeginDate > EndDate then 'ASSERT_ENDDATE_AFTER_BEGINDATE' 
  when Bookings.Flight.date not between BeginDate and EndDate then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  when BookingFee < 0 then 'Booking fee cannot be negative' 
  when exists Bookings [Flight.date < $self.BeginDate] then error ('ASSERT_BOOKINGS_IN_TRAVEL_PERIOD',
    null, ('Bookings.{row index}.Flight.date')
  )
  when length(Description) < 3 then 'Description too short' 
end);


@cds.api.ignore
@cds.persistence.skip
// view TravelServce.Travels.constraints as select from TravelService.Travels {
// view sap.capire.travels.Travels.constraints as projection on sap.capire.travels.Travels {
// view constraints as select from db.Travels {
view Travels.constraints as select from db.Travels {
// type TravelService.Travels.constraints : projection on db.Travels {

  ID, 
  Customer is not null as ASSERT_Customer_specified,
  exists Customer as ASSERT_Customer_exists,
  // Customer exists as ASSERT_CUSTOMER_EXISTS,
  
  BeginDate <= EndDate as ASSERT_BeginDate_before_EndDate,
  BookingFee >= 0 as ASSERT_BookingFee_non_negative,

  Bookings.{ // FIXME: should be an expand, but 2sql rejects this even though the entity is annotated with @cds.persistence.skip

    Pos, 
    Travel is not null as ASSERT_Bookings_travel_specified,
    Flight is not null as ASSERT_Bookings_flight_specified,
    // exists Flight as ASSERT_BOOKINGS_FLIGHT_EXISTS,
    // exists Travel as ASSERT_BOOKINGS_TRAVEL_EXISTS,
    Flight.date between Travel.BeginDate and Travel.EndDate as ASSERT_Bookings_Flight_date_in_travel_period, 
    Currency == Travel.Currency as ASSERT_Bookings_currency_match,

  },
}
