using { sap.capire.travels as db } from '../db/schema';

// Types for extension point interfaces — fields are nullable since only changed fields are passed
type TravelData {
  ID            : Integer;
  Description   : String(1024) null;
  BeginDate     : Date null;
  EndDate       : Date null;
  BookingFee    : Decimal(9,4) null;
  TotalPrice    : Decimal(9,4) null;
  Currency_code : String(3) null;
  Status_code   : String(1) null;
  Agency_ID     : String(10) null;
  Customer_ID   : String(10) null;
  Bookings      : array of BookingData;
}

type BookingData {
  Travel_ID     : Integer null;
  Pos           : Integer null;
  Flight_ID     : String(50) null;
  Flight_date   : Date null;
  FlightPrice   : Decimal(9,4) null;
  Currency_code : String(3) null;
  BookingDate   : Date null;
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
