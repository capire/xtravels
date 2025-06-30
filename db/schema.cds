using { FlightsService as md } from '@capire/sflights';
using { managed, sap } from '@sap/cds/common';

namespace sap.capire.travels;

type Currency : Association to md.Currencies;
type Country : Association to md.Countries;
type Price : Decimal(16,3);

entity Travels : managed {
  key ID           : UUID;
      TravelID     : Integer default 0 @readonly;
      Description  : String(1024);
      BeginDate    : Date default $now;
      EndDate      : Date default $now;
      BookingFee   : Price default 0;
      TotalPrice   : Price @readonly; Currency: Currency default 'EUR';
      Status       : Association to TravelStatus @readonly default 'O';
      Agency       : Association to TravelAgencies;
      Customer     : Association to Passengers;
      Bookings     : Composition of many Bookings on Bookings.Travel = $self;
}


entity Bookings {
  key Travel      : Association to Travels;
  key BookingID   : Integer @readonly;
      BookingDate : Date default $now;
      Flight      : Association to md.Flights;
      // Note: Price and Currency are copied from master data to capture the price at booking time
      FlightPrice : Price; Currency: Currency;
      Supplements : Composition of many Supplements on Supplements.Booking = $self;
}

entity Supplements {
  key ID         : UUID;
      Booking    : Association to Bookings;
      Supplement : Association to md.Supplements;
      // Note: Price and Currency are copied from master data to capture the price at booking time
      Price      : Price; Currency: Currency;
}

entity TravelAgencies {
  key AgencyID     : String(6);
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
  key CustomerID   : String(6);
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
    Accepted = 'A';
    Canceled = 'X';
  }
}
