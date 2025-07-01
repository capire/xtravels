using TravelService from '../../srv/travel-service';

annotate TravelService.Travels with @odata.draft.enabled;
annotate TravelService.Travels with @Common.SemanticKey: [TravelID];
annotate TravelService.Bookings with @Common.SemanticKey: [BookingID];
annotate TravelService.Bookings.Supplements with @Common.SemanticKey: [ID];
