namespace sap.capire.travels;

using { sap, managed, Country, Currency } from '@sap/cds/common';
using {
  sap.capire.travels.masterdata.Flights,
  sap.capire.travels.masterdata.Supplements,
} from './master-data';


entity Travels : managed {
  key ID       : Integer default 0 @readonly;
  Description  : String(1024);
  BeginDate    : Date default $now;
  EndDate      : Date default $now;
  BookingFee   : Price default 0;
  TotalPrice   : Price @readonly;
  Currency     : Currency default 'EUR';
  Status       : Association to TravelStatus default 'O';
  Agency       : Association to TravelAgencies;
  Customer     : Association to Passengers;
  Bookings     : Composition of many Bookings on Bookings.Travel = $self;
}


entity Bookings {
  key Travel      : Association to Travels;
  key Pos         : Integer @readonly;
      Flight      : Association to Flights;
      FlightPrice : Price;
      Currency    : Currency;
      Supplements : Composition of many {
        key ID   : UUID;
        booked   : Association to Supplements;
        Price    : Price;
        Currency : Currency;
      };
      BookingDate : Date default $now;
}

entity TravelAgencies {
  key ID           : String(6);
      Name         : String(80);
      Street       : String(60);
      PostalCode   : String(10);
      City         : String(40);
      Country      : Country;
      PhoneNumber  : String(30);
      EMailAddress : String(256);
      WebAddress   : String(256);
};


entity Passengers : managed {
  key ID           : String(6);
      FirstName    : String(40);
      LastName     : String(40);
      Title        : String(10);
      Street       : String(60);
      PostalCode   : String(10);
      City         : String(40);
      Country      : Country;
      PhoneNumber  : String(30);
      EMailAddress : String(256);
}


entity TravelStatus : sap.common.CodeList {
  key code : String(1) enum {
    Open     = 'O';
    InReview = 'P';
    Blocked  = 'B';
    Accepted = 'A';
    Canceled = 'X';
  }
}


type Price : Decimal(9,4);
