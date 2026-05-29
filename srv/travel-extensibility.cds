using { TravelService } from './travel-service';

// Allow extension code on Travels (CRUD handlers + bound actions)
annotate TravelService.Travels with @extensible.code;
