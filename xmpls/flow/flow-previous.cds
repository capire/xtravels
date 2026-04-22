using {TravelService} from '../../srv/travel-flows';

// Add actions
extend TravelService.Travels with actions {
  action reviewTravel();
  action blockTravel();
  action unblockTravel();
};

// Extend flow
annotate TravelService.Travels with actions {
  reviewTravel   @from: [ #Open ]             @to: #InReview;
  blockTravel    @from: [ #InReview, #Open ]  @to: #Blocked;
  unblockTravel  @from: [ #Blocked ]          @to: $flow.previous;
  acceptTravel   @from: [ #InReview ];
  rejectTravel   @from: [ #InReview ];
  reopenTravel   @from: [ #InReview, ... ]    @to: #Open;
};

// Add labels for UIs
annotate TravelService.Travels with actions {
  reviewTravel    @title: '{i18n>Review}';
  blockTravel     @title: '{i18n>Block}';
  unblockTravel   @title: '{i18n>Unblock}';
};
