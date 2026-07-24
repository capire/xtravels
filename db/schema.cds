namespace sap.capire.travels;

using { sap, managed, Country, Currency } from '@sap/cds/common';
using { sap.capire.xflights as x } from '../apis/capire/xflights';
using { sap.capire.s4 } from '../apis/capire/s4';


entity Travels : managed {
  key ID       : Integer @readonly;
  Description  : String(1024);
  BeginDate    : Date default $now;
  EndDate      : Date default $now;
  BookingFee   : Price default 0;
  TotalPrice   : Price @readonly;
  Currency     : Currency default 'EUR';
  Status       : Association to TravelStatus default 'O';
  Agency       : Association to TravelAgencies;
  Customer     : Association to s4.Customers;
  Bookings     : Composition of many Bookings on Bookings.Travel = $self;

  /** Trip purpose — helpful for AI recommendations based on customer profile
   *  and destination. Fixed-value dropdown in the Fiori UI. */
  TravelPurpose : Association to TravelPurposes;

  /** Payment method for the trip — recommended by AI based on the customer's
   *  historic preference. Fixed-value dropdown in the Fiori UI. */
  PaymentMethod : Association to PaymentMethods;
}


entity Bookings {
  key Travel      : Association to Travels;
  key Pos         : Integer @readonly;
      Flight      : Association to x.Flights;
      FlightPrice : Price;
      Currency    : Currency;
      Supplements : Composition of many {
        key ID   : UUID;
        booked   : Association to x.Supplements;
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


entity TravelStatus : sap.common.CodeList {
  key code : String(1) enum {
    Open     = 'O';
    InReview = 'P';
    Blocked  = 'B';
    Accepted = 'A';
    Rejected = 'X';
  }
}


entity TravelPurposes : sap.common.CodeList {
  key code : String(20) enum {
    Business;
    Leisure;
    Conference;
    Family;
    Bleisure;   //> business + leisure combo
  }
}


entity PaymentMethods : sap.common.CodeList {
  key code : String(20) enum {
    CreditCard;
    Invoice;
    Wire;
    CompanyAccount;
  }
}


type Price : Decimal(9,4);



// Extend Customers to navigate to back to local Travels
extend s4.Customers with columns {
  Travels : Association to many Travels on Travels.Customer = $self
}

// Extend Flights to navigate to back to local Bookings
extend x.Flights with columns {
  Bookings : Association to many Bookings on Bookings.Flight = $self
}
