using { TravelService.Travels } from './travel-service';

annotate Travels with @(restrict: [
  { grant: 'READ', to: 'authenticated-user'},
  { grant: ['rejectTravel','acceptTravel','deductDiscount'], to: 'reviewer'},
  { grant: ['*'], to: 'processor'},
  { grant: ['*'], to: 'admin'}
])
