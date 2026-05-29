using { TravelService } from './travel-service';

@kind: 'ext-service'
service TravelExtensionService {

  // Extension point: validate a travel before it is saved
  // Called from TravelService before CREATE and UPDATE of Travels
  action validateTravel(travel_ID: Integer);

  // Extension point: react when a booking is added
  // Called from TravelService after a booking is created
  action onBookingCreated(travel_ID: Integer, bookingPos: Integer);

  // Expose read-only views so extension code can read app data
  @readonly entity Travels    as projection on TravelService.Travels;
  @readonly entity Bookings   as projection on TravelService.Bookings;
  @readonly entity TravelAgencies as projection on TravelService.TravelAgencies;
}
