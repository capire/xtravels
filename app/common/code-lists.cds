using from '../../db/schema';

//
// annotations for value helps
//

// annotate schema.TravelStatus with {
//   code @Common: { Text: name, TextArrangement: #TextOnly }
// }

annotate sap.capire.travels.Travels {

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


annotate sap.capire.travels.Bookings {

  Flight {
    @Common.ValueList: {
      CollectionPath : 'Flights',
      Label : '',
      Parameters : [
        {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Flight_ID,   ValueListProperty: 'ID'},
        {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Flight_date, ValueListProperty: 'date'},
        {$Type: 'Common.ValueListParameterOut',   LocalDataProperty: FlightPrice, ValueListProperty: 'price'},
        {$Type: 'Common.ValueListParameterOut',   LocalDataProperty: Currency_code, ValueListProperty: 'currency_code'},
        {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'airline'},
        {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'destination'}
      ]
    }
    ID;
    @Common.ValueList: {
      CollectionPath : 'Flights',
      Label : '',
      Parameters : [
        {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Flight_ID,   ValueListProperty: 'ID'},
        {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: Flight_date, ValueListProperty: 'date'},
        {$Type: 'Common.ValueListParameterOut',   LocalDataProperty: FlightPrice, ValueListProperty: 'price'},
        {$Type: 'Common.ValueListParameterOut',   LocalDataProperty: Currency_code, ValueListProperty: 'currency_code'},
        {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'airline'},
        {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'destination'}
      ]
    }
    date;
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


annotate sap.capire.travels.Bookings.Supplements {

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


annotate sap.capire.xflights.Flights with @UI.PresentationVariant#SortOrderPV : {    // used in ValueList for Bookings:ConnectionId above
    SortOrder      : [{
      Property   : flightDate,
      Descending : true
    }]
  }
{
  airline @Common.ValueList: {
    CollectionPath : 'Airline',
    Label : '',
    Parameters : [
      {$Type: 'Common.ValueListParameterInOut', LocalDataProperty: AirlineID, ValueListProperty: 'AirlineID'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'},
      {$Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Currency'}
    ]
  };
};


annotate sap.capire.travels.Passengers {

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


annotate sap.capire.travels.TravelAgencies {

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
