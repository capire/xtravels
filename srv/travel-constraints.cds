using { TravelService } from './travel-service';

annotate TravelService.Travels with {
  BeginDate @mandatory;
  EndDate @mandatory;
  Agency @mandatory;
  Customer @mandatory;
}

annotate TravelService.Bookings with {
  Travel @mandatory;
  Flight @mandatory;
}
