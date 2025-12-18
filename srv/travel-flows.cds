using { TravelService } from './travel-service';

annotate TravelService.Travels with @flow.status: Status actions {
  deductDiscount  @from: [ #Open ]; // restricted #Open travels
  acceptTravel    @from: [ #Open ]                @to: #Accepted;
  rejectTravel    @from: [ #Open ]                @to: #Rejected;
  reopenTravel    @from: [ #Rejected, #Accepted ] @to: #Open;
}
