using {TravelService} from '../../srv/travel-service';

// add actions
extend TravelService.Travels with actions {
  action reviewTravel();
  action reopenTravel();
  action blockTravel();
  action unblockTravel();
};

// extend flow
annotate TravelService.Travels with actions {
  reviewTravel    @from: #Open               @to: #InReview;
  reopenTravel    @from: #InReview           @to: #Open;
  blockTravel     @from: [#Open, #InReview]  @to: #Blocked;
  unblockTravel   @from: #Blocked            @to: $flow.previous;
  // in the extended flow, accept/reject only from InReview
  acceptTravel    @from: #InReview;
  rejectTravel    @from: #InReview;
};

// specify ui labels
annotate TravelService.Travels with actions {
  reviewTravel    @title: '{i18n>ReviewTravel}';
  reopenTravel    @title: '{i18n>ReopenTravel}';
  blockTravel     @title: '{i18n>BlockTravel}';
  unblockTravel   @title: '{i18n>UnblockTravel}';
};
