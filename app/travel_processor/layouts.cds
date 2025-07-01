using { TravelService } from '../../srv/travel-service';

//
// annotations that control the Fiori layout
//

annotate TravelService.Travels with @UI : {

  Identification : [
    { $Type  : 'UI.DataFieldForAction', Action : 'TravelService.acceptTravel',   Label  : '{i18n>AcceptTravel}'   },
    { $Type  : 'UI.DataFieldForAction', Action : 'TravelService.rejectTravel',   Label  : '{i18n>RejectTravel}'   },
    { $Type  : 'UI.DataFieldForAction', Action : 'TravelService.deductDiscount', Label  : '{i18n>DeductDiscount}' }
  ],

  HeaderInfo : {
    TypeName       : '{i18n>Travel}',
    TypeNamePlural : '{i18n>Travels}',
    Title          : { Value: Description },
    Description    : { Value: TravelID }
  },

  PresentationVariant : {
    Text           : 'Default',
    Visualizations : ['@UI.LineItem'],
    SortOrder      : [{ Property: TravelID, Descending: true }]
  },

  // REVISIT: We need to refer to generated foreign keys here, for related value helps
  // to work. Should be able to use associations instead.
  SelectionFields : [
    Agency_ID,
    Customer_ID,
    Status_code,
  ],

  LineItem : [

    { $Type  : 'UI.DataFieldForAction', Action : 'TravelService.acceptTravel',   Label  : '{i18n>AcceptTravel}'   },
    { $Type  : 'UI.DataFieldForAction', Action : 'TravelService.rejectTravel',   Label  : '{i18n>RejectTravel}'   },
    { $Type  : 'UI.DataFieldForAction', Action : 'TravelService.deductDiscount', Label  : '{i18n>DeductDiscount}' },

    { Value : TravelID, @UI.Importance : #High },
    { Value : Description, @UI.Importance : #High },
    { Value : Agency_ID, @HTML5.CssDefaults: {width:'16em'} },
    { Value : Customer_ID, @UI.Importance : #High, @HTML5.CssDefaults: {width:'14em'} },
    { Value : BeginDate,  @HTML5.CssDefaults: {width:'9em'} },
    { Value : EndDate,    @HTML5.CssDefaults: {width:'9em'} },
    { Value : BookingFee, @HTML5.CssDefaults: {width:'10em'} },
    { Value : TotalPrice, @HTML5.CssDefaults: {width:'12em'} },
    { Value : Status.code,
      Criticality : (
        Status.code == 'A' ? 3 : (
        Status.code == 'O' ? 2 : (
        Status.code == 'X' ? 1 : 0
      ))),
      @UI.Importance : #High,
      @HTML5.CssDefaults: {width:'10em'}
    }
  ],

  Facets : [{
    $Type  : 'UI.ReferenceFacet', Target : '@UI.FieldGroup#TravelData',
    Label  : '{i18n>GeneralInformation}',
  }, {  // booking list
    $Type  : 'UI.ReferenceFacet',
    Target : 'Bookings/@UI.PresentationVariant',
    Label  : '{i18n>Bookings}'
  }],

  FieldGroup#TravelData : { Data : [
    { Value : Agency_ID     },
    { Value : Customer_ID },
    { Value : Description            },
    { Value : Status.code, Label : '{i18n>Status}', // label only necessary if differs from title of element
      Criticality : (
        Status.code == 'A' ? 3 : (
        Status.code == 'O' ? 2 : (
        Status.code == 'X' ? 1 : 0
      ))),
    },
    { Value : BeginDate },
    { Value : EndDate },
    { Value : BookingFee },
    { Value : TotalPrice },
  ]}
};

annotate TravelService.Bookings with @UI : {
  Identification : [
    { Value : BookingID },
  ],

  HeaderInfo : {
    TypeName       : '{i18n>Bookings}',
    TypeNamePlural : '{i18n>Bookings}',
    Title          : { Value : Travel.Customer.LastName },
    Description    : { Value : BookingID }
  },

  PresentationVariant : {
    Visualizations : ['@UI.LineItem'],
    SortOrder      : [{
      $Type      : 'Common.SortOrderType',
      Property   : BookingID,
      Descending : false
    }]
  },

  SelectionFields : [],

  LineItem : [
    { Value : Flight.icon, Label : '  '},
    { Value : BookingID },
    { Value : BookingDate },
    { Value : Flight.airline, Label : '{i18n>Airline}' },
    { Value : Flight.flightNumber, Label : '{i18n>FlightNumber}' },
    { Value : Flight.flightDate, Label : '{i18n>FlightDate}' },
    { Value : Flight.departure, Label : 'From' },
    { Value : Flight.destination, Label : 'To' },
    { Value : FlightPrice, Label : '{i18n>FlightPrice}' },
  ],

  Facets : [{
    $Type  : 'UI.CollectionFacet',
    Label  : '{i18n>GeneralInformation}',
    ID     : 'Booking',
    Facets : [{  // booking details
      $Type  : 'UI.ReferenceFacet',
      ID     : 'BookingData',
      Target : '@UI.FieldGroup#GeneralInformation',
      Label  : '{i18n>Booking}'
    }, {  // flight details
      $Type  : 'UI.ReferenceFacet',
      ID     : 'FlightData',
      Target : '@UI.FieldGroup#Flight',
      Label  : '{i18n>Flight}'
    }]
  }, {  // supplements list
    $Type  : 'UI.ReferenceFacet',
    ID     : 'SupplementsList',
    Target : 'Supplements/@UI.PresentationVariant',
    Label  : '{i18n>BookingSupplements}'
  }],

  FieldGroup #GeneralInformation : { Data : [
    { Value : BookingID              },
    { Value : BookingDate,           },
    { Value : Travel.Customer.ID },
    { Value : BookingDate,           },
  ]},

  FieldGroup #Flight : { Data : [
    { Value : Flight.airline   },
    { Value : Flight.flightNumber           },
    { Value : Flight.flightDate             },
    { Value : FlightPrice            }
  ]},
};

annotate sap.capire.travels.masterdata.federated.Flights:icon with @UI.IsImageURL;

annotate TravelService.Bookings.Supplements with @UI : {
  Identification : [
    { Value : ID }
  ],
  HeaderInfo : {
    TypeName       : '{i18n>BookingSupplement}',
    TypeNamePlural : '{i18n>BookingSupplements}',
    Title          : { Value : ID },
    Description    : { Value : ID }
  },
  PresentationVariant : {
    Text           : 'Default',
    Visualizations : ['@UI.LineItem'],
    SortOrder      : [{
      $Type      : 'Common.SortOrderType',
      Property   : ID,
      Descending : false
    }]
  },
  LineItem : [
    { Value : ID                                       },
    { Value : booked.ID, Label : '{i18n>ProductID}'    },
    { Value : Price,     Label : '{i18n>ProductPrice}' }
  ],
};
