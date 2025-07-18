using { TravelService, sap.capire.travels.TravelStatus } from '../../srv/travel-service';
//
// annotations that control the behavior of fields and actions
//

extend entity TravelStatus with {
  fieldControl: UInt8 enum {
    Inapplicable = 0;
    ReadOnly = 1;
    Optional = 3;
    Mandatory = 7;
  };
  insertDeleteRestriction: Boolean; // = NOT createDeleteHidden
  createDeleteHidden: Boolean;
}


annotate TravelService.Travels with @(Common : {
  SideEffects: {
    SourceProperties: [BookingFee],
    TargetProperties: ['TotalPrice']
  },
}){
  BookingFee  @Common.FieldControl  : Status.fieldControl;
  BeginDate   @Common.FieldControl  : Status.fieldControl;
  EndDate     @Common.FieldControl  : Status.fieldControl;
  Agency   @Common.FieldControl  : Status.fieldControl;
  Customer @Common.FieldControl  : Status.fieldControl;

} actions {
  rejectTravel @(
    Core.OperationAvailable : ( $self.Status.code != 'X' ), // FIXME: wrong error in editor
    Common.SideEffects.TargetProperties : ['in/Status/code','in/Status_code'],
  );
  acceptTravel @(
    Core.OperationAvailable : ( $self.Status.code != 'A' ), // FIXME: wrong error in editor
    Common.SideEffects.TargetProperties : ['in/Status/code','in/Status_code'],
  );
  deductDiscount @(
    Core.OperationAvailable : ( $self.Status.code == 'O' ),
    Common.SideEffects.TargetProperties : ['in/TotalPrice', 'in/BookingFee'],
  );
}

annotate TravelService.Travels @Common.SideEffects#ReactonItemCreationOrDeletion : {
  SourceEntities : [ Bookings ],
  TargetProperties : [ 'TotalPrice' ]
};

annotate TravelService.Bookings with @UI.CreateHidden : Travel.Status.createDeleteHidden;
annotate TravelService.Bookings with @UI.DeleteHidden : Travel.Status.createDeleteHidden;

annotate TravelService.Bookings {
  BookingDate   @Core.Computed;
  Flight        @Common.FieldControl  : Travel.Status.fieldControl;
  FlightPrice   @Common.FieldControl  : Travel.Status.fieldControl;
};

annotate TravelService.Bookings with @Capabilities.NavigationRestrictions.RestrictedProperties : [
  {
    NavigationProperty : Supplements,
    InsertRestrictions : {
      Insertable : Travel.Status.insertDeleteRestriction
    },
    DeleteRestrictions : {
      Deletable : Travel.Status.insertDeleteRestriction
    }
  }
];


annotate TravelService.Bookings.Supplements with @UI.CreateHidden : up_.Travel.Status.createDeleteHidden {
  Price         @Common.FieldControl  : up_.Travel.Status.fieldControl;
  booked @Common.FieldControl  : up_.Travel.Status.fieldControl;
};
