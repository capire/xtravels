using { TravelService, sap.capire.travels.TravelStatus } from '../../srv/travel-service';
//
// annotations that control the behavior of fields and actions
//

extend entity TravelStatus with {
  fieldControl: Int16 @odata.Type:'Edm.Byte' enum {
    Inapplicable = 0;
    ReadOnly = 1;
    Optional = 3;
    Mandatory = 7;
  } = ( code = #Accepted ? #ReadOnly : #Mandatory );
}


annotate TravelService.Travels with @(Common : {
  SideEffects #priceChanged: {
    SourceEvents    : ['priceChanged'],
    TargetProperties: ['TotalPrice', 'BookingFee']
  },
}){
  BookingFee  @Common.FieldControl  : Status.fieldControl;
  BeginDate   @Common.FieldControl  : Status.fieldControl;
  EndDate     @Common.FieldControl  : Status.fieldControl;
  Agency      @Common.FieldControl  : Status.fieldControl;
  Customer    @Common.FieldControl  : Status.fieldControl;
} actions {
  deductDiscount;
};

annotate TravelService.Bookings with @UI.CreateHidden : (Travel.Status.code != #Open);
annotate TravelService.Bookings with @UI.DeleteHidden : (Travel.Status.code != #Open);

annotate TravelService.Bookings {
  BookingDate   @Core.Computed;
  Flight        @Common.FieldControl  : Travel.Status.fieldControl;
  FlightPrice   @Common.FieldControl  : Travel.Status.fieldControl;
};

annotate TravelService.Bookings with @Capabilities.NavigationRestrictions.RestrictedProperties : [
  {
    NavigationProperty : Supplements,
    InsertRestrictions : {
      Insertable : (Travel.Status.code = #Open)
    },
    DeleteRestrictions : {
      Deletable : (Travel.Status.code = #Open)
    }
  }
];


annotate TravelService.Bookings.Supplements with @UI.CreateHidden : (up_.Travel.Status.code != #Open) {
  Price  @Common.FieldControl  : up_.Travel.Status.fieldControl;
  booked @Common.FieldControl  : up_.Travel.Status.fieldControl;
};
