using { sap.capire.travels as t } from '../db/schema';
using { sap.capire.s4 } from '../apis/capire/s4';

@protocol: 'ina'
service TravelAnalyticsService {

  // Authorization: analytics role can see everything, analytics-restricted can see only their agency
  @restrict: [{
    grant: ['READ'],
    to: 'analytics'
  }, {
    grant: ['READ'],
    to: 'analytics-restricted',
    where: 'Agency.ID = $user.agency'
  }]
  @ObjectModel.modelingPattern: #ANALYTICAL_CUBE
  @ObjectModel.supportedCapabilities: [#ANALYTICAL_PROVIDER]
  entity TravelAnalytics as select from t.Travels {
    // Key
    key ID,

    // Dimension fields
    @ObjectModel.foreignKey.association: Agency
    Agency.ID as Agency_ID,
    Agency,

    @ObjectModel.foreignKey.association: Customer
    Customer.ID as Customer_ID,
    Customer,

    @ObjectModel.foreignKey.association: Status
    Status.code as Status_code,
    Status,

    @ObjectModel.foreignKey.association: to_BeginDate
    BeginDate,
    EndDate,

    // Navigation attributes
    Customer.Name as CustomerName,
    Agency.Name as AgencyName,
    Status.name as StatusName,

    // Currency dimension
    Currency as currency,

    // Base Measures
    @AnalyticsDetails.measureType: #BASE
    @Aggregation.default: #SUM
    @Measures.ISOCurrency: currency_code
    TotalPrice,

    @AnalyticsDetails.measureType: #BASE
    @Aggregation.default: #SUM
    @Measures.ISOCurrency: currency_code
    BookingFee,

    // Calculated Measure: Net Revenue (TotalPrice - BookingFee)
    @AnalyticsDetails.measureType: #CALCULATION
    @Measures.ISOCurrency: currency_code
    $self.TotalPrice - $self.BookingFee as NetRevenue : Decimal,

    // Count Measure
    @AnalyticsDetails.measureType: #BASE
    @Aggregation.default: #COUNT
    1 as TravelCount : Integer,

    // Distinct Count: Count distinct customers
    @AnalyticsDetails.measureType: #BASE
    @Aggregation.default: #COUNT_DISTINCT
    Customer.ID as DistinctCustomersCount : String,

    // Average Measure: Average booking fee
    @AnalyticsDetails.measureType: #BASE
    @Aggregation.default: #AVG
    @Measures.ISOCurrency: currency_code
    BookingFee as AvgBookingFee : Decimal,

    // Association to time dimension (will be defined below)
    to_BeginDate : Association[0..1] to CalendarDateDimension on to_BeginDate.Date = BeginDate
  };

}

// Dimension Entities

// Travel Agencies Dimension
annotate t.TravelAgencies with 
  @ObjectModel.modelingPattern: #ANALYTICAL_DIMENSION
  @ObjectModel.supportedCapabilities: [#ANALYTICAL_DIMENSION]
{
  @ObjectModel.text.element: Name
  ID;
  @Semantics.text: true
  Name;
};

// Travel Status Dimension
annotate t.TravelStatus with 
  @ObjectModel.modelingPattern: #ANALYTICAL_DIMENSION
  @ObjectModel.supportedCapabilities: [#ANALYTICAL_DIMENSION]
{
  @ObjectModel.text.element: name
  code;
  @Semantics.text: true
  name;
};

// Calendar Date base entity for time hierarchy
using { sap.capire.travels.CalendarDate } from '../db/calendar';

// Calendar Date Dimension with leveled hierarchy
@ObjectModel.modelingPattern: #ANALYTICAL_DIMENSION
@ObjectModel.supportedCapabilities: [#ANALYTICAL_DIMENSION]
@Analytics.dimensionType: #TIME
@Hierarchy.leveled: [{
  name: 'YQMD',
  label: 'Year/Quarter/Month',
  levels: [{ element: Year }, { element: Quarter }, { element: Month }, { element: Date }]
}]
entity CalendarDateDimension as projection on CalendarDate {
  Date,
  @Common.IsCalendarYear: true
  Year,
  @Common.IsCalendarQuarter
  Year || Quarter as Quarter : String(5),
  @Common.IsCalendarMonth
  Year || (length(Month) = 1 ? '0' : '' ) || Month as Month : String(6)
}

// Extend Travels entity to add association to time dimension
extend t.Travels with {
  to_BeginDate: Association[0..1] to CalendarDateDimension on to_BeginDate.Date = BeginDate;
}
