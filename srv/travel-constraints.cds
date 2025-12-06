using { TravelService } from './travel-service.cds';

annotate TravelService.Travels with {
  BeginDate @mandatory;
  EndDate @mandatory;
  Agency @mandatory;
  Customer @mandatory;
}

annotate TravelService.Bookings with {
  Flight @mandatory;
  Travel @mandatory;
}
