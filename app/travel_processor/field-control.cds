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
  ConnectionID  @Common.FieldControl  : Travel.Status.fieldControl;
  FlightDate    @Common.FieldControl  : Travel.Status.fieldControl;
  FlightPrice   @Common.FieldControl  : Travel.Status.fieldControl;
  to_Carrier    @Common.FieldControl  : Travel.Status.fieldControl;
  to_Customer   @Common.FieldControl  : Travel.Status.fieldControl;
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


annotate TravelService.Supplements {
  Price         @Common.FieldControl  : Booking.Travel.Status.fieldControl;
  Supplement @Common.FieldControl  : Booking.Travel.Status.fieldControl;
  Booking    @Common.FieldControl  : Booking.Travel.Status.fieldControl;
};
