namespace sap.capire.travels;

// Calendar Date base entity for time hierarchy
entity CalendarDate {
  key Date: Date;
  Year: String(4);
  Halfyear: String(1);
  Quarter: String(1);
  Month: String(2);
}
