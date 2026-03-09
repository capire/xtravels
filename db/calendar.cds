namespace sap.capire.travels;

// Calendar Date base entity for time hierarchy
entity CalendarDate {
  key Date: Date;
  @Analytics.dimension: true
  Year: String(4);
  @Analytics.dimension: true
  Halfyear: String(1);
  @Analytics.dimension: true
  Quarter: String(1);
  @Analytics.dimension: true
  Month: String(2);
}
