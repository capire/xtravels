using { sap.capire.travels as schema } from '../db/schema';

//
// annotations for value helps
//

// annotate schema.TravelStatus with {
//   code @Common: { Text: name, TextArrangement: #TextOnly }
// }

annotate schema.Travels {

  Status @Common.ValueListWithFixedValues;

  Agency @Common.ValueList: {
    CollectionPath : 'TravelAgencies',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Agency_ID, ValueListProperty: 'ID'},  // local data property is the foreign key
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Street'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PostalCode'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryCode_code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PhoneNumber'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'EMailAddress'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'WebAddress'}
    ]
  };

  Customer @Common.ValueList: {
    CollectionPath : 'Passengers',
    Label : 'Customer ID',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Customer_ID, ValueListProperty: 'ID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'FirstName'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'LastName'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Title'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Street'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PostalCode'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryCode_code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PhoneNumber'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'EMailAddress'}
    ]
  };

  Currency @Common.ValueList: {
    CollectionPath : 'Currencies',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Currency_code, ValueListProperty: 'code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'descr'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'symbol'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'minor'}
    ]
  };

}


annotate schema.Bookings {

  Status @Common.ValueListWithFixedValues;

  Customer @Common.ValueList: {
    CollectionPath : 'Passenger',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Customer_ID, ValueListProperty: 'ID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'FirstName'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'LastName'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Title'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Street'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PostalCode'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryCode_code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PhoneNumber'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'EMailAddress'}
    ]
  };

  Carrier @Common.ValueList: {
    CollectionPath : 'Airline',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: to_Carrier_AirlineID, ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Currency_code'}
    ]
  };

  Connection @Common.ValueList: {
    CollectionPath : 'Flight',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: to_Carrier_AirlineID,    ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: ConnectionID, ValueListProperty: 'ConnectionID'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: FlightDate,   ValueListProperty: 'FlightDate'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: FlightPrice,  ValueListProperty: 'Price'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Currency_code, ValueListProperty: 'Currency_code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'to_Airline/Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PlaneType'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'MaximumSeats'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'OccupiedSeats'}
    ],
    PresentationVariantQualifier: 'SortOrderPV'  // use presentation variant to sort by FlightDate desc
  };

  FlightDate @Common.ValueList: {
    CollectionPath : 'Flight',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: to_Carrier_AirlineID,    ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: ConnectionID, ValueListProperty: 'ConnectionID'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: FlightDate,   ValueListProperty: 'FlightDate'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: FlightPrice,  ValueListProperty: 'Price'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Currency_code, ValueListProperty: 'Currency_code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'to_Airline/Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PlaneType'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'MaximumSeats'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'OccupiedSeats'}
    ]
  };

  Currency @Common.ValueList: {
    CollectionPath : 'Currencies',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Currency_code, ValueListProperty: 'code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'descr'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'symbol'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'minor'}
    ]
  };

}


annotate schema.Bookings.Supplements {

  booked @Common.ValueList: {
    CollectionPath : 'Supplement',
    Label : '',
    Parameters : [
    {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: booked_ID, ValueListProperty: 'ID'},
    {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Price,        ValueListProperty: 'Price'},
    {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Currency_code, ValueListProperty: 'Currency_code'},
    {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Description'}
    ]
  };

  Currency @Common.ValueList: {
    CollectionPath : 'Currencies',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Currency_code, ValueListProperty: 'code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'descr'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'symbol'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'minor'}
    ]
  };
}


using sap.capire.flights;


annotate flights.Flights with @UI.PresentationVariant#SortOrderPV : {    // used in ValueList for Bookings:ConnectionId above
    SortOrder      : [{
      Property   : flightDate,
      Descending : true
    }]
  }
{
  AirlineID @Common.ValueList: {
    CollectionPath : 'Airline',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: AirlineID, ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Currency'}
    ]
  };

  connection @Common.ValueList: {
    CollectionPath : 'FlightConnection',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: AirlineID, ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: ConnectionID, ValueListProperty: 'ConnectionID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'AirlineID_Text'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'DepartureAirport'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'DestinationAirport'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'DepartureTime'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'ArrivalTime'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Distance'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'DistanceUnit'}
    ]
  };
};



annotate flights.Connections {

  airline @Common.ValueList: {
    CollectionPath : 'Airline',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: AirlineID, ValueListProperty: 'CarrierID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Currency'}
    ]
  };

  DepartureAirport @Common.ValueList: {
    CollectionPath : 'Airport',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: DepartureAirport_AirportID, ValueListProperty: 'Airport_ID'},  // here FK is required
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'AirportID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Country'}
    ]
  };

  DestinationAirport @Common.ValueList: {
    CollectionPath : 'Airport',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut',       LocalDataProperty: DestinationAirport_AirportID, ValueListProperty: 'Airport_ID'},  // here FK is required
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'AirportID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Country'}
    ]
  };

}


annotate schema.Passengers {

  Country @Common.ValueList : {
    CollectionPath  : 'Countries',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut',       LocalDataProperty : Country_code, ValueListProperty : 'code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'descr'}
    ]
  };

}


annotate schema.TravelAgencies {

  Country @Common.ValueList: {
    CollectionPath : 'Countries',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut',       LocalDataProperty: CountryCode_code, ValueListProperty: 'code'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'descr'}
    ]
  };

}
