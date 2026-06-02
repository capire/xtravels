using { sap.capire.travels as db } from '../db/schema';

// Types for extension point interfaces
type TravelData {
  ID            : Integer;
  Description   : String(1024);
  BeginDate     : Date;
  EndDate       : Date;
  BookingFee    : Decimal(9,4);
  TotalPrice    : Decimal(9,4);
  Currency_code : String(3);
  Status_code   : String(1);
  Agency_ID     : String(10);
  Customer_ID   : String(10);
  Bookings      : array of BookingData;
}

type BookingData {
  Travel_ID     : Integer;
  Pos           : Integer;
  Flight_ID     : String(50);
  Flight_date   : Date;
  FlightPrice   : Decimal(9,4);
  Currency_code : String(3);
  BookingDate   : Date;
}

@kind: 'ext-service'
service TravelExtensionService {

  // Extension point: validate a travel before it is saved
  // Called from TravelService before CREATE and UPDATE of Travels
  action validateTravel(travel: TravelData, user: String, timestamp: String);

  // Extension point: react when a booking is added
  // Called from TravelService after a booking is created
  action bookingCreated(booking: BookingData, user: String);

  // Expose read-only views so extension code can read app data
  @readonly entity Travels        as projection on db.Travels;
  @readonly entity Bookings       as projection on db.Bookings;
  @readonly entity TravelAgencies as projection on db.TravelAgencies;
}
