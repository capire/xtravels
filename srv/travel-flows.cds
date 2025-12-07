using { TravelService.Travels } from './travel-service';

annotate Travels with @flow.status: Status actions {
  deductDiscount  @from: [ #Open ]; // can only be called on #Open travels
  acceptTravel    @from: [ #Open ]                @to: #Accepted;
  rejectTravel    @from: [ #Open ]                @to: #Rejected;
  reopenTravel    @from: [ #Rejected, #Accepted ] @to: #Open;
}

// Note: The above @flow.status annotation makes that field @readonly by default
