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

    // Dimension fields with associations
    Agency.ID as Agency_ID,
    Customer.ID as Customer_ID,
    Status.code as Status_code,
    
    // Time dimension
    BeginDate,
    EndDate,

    // Navigation attributes for time hierarchy
    to_BeginDate.Month as BeginMonth,
    to_BeginDate.Quarter as BeginQuarter,
    to_BeginDate.Year as BeginYear,

    // Navigation attributes for dimensions  
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

    // Restricted Measure: Revenue by Status (using literal)
    @AnalyticsDetails.measureType: #RESTRICTION
    case when Status.code = 'A'
      then TotalPrice
      end as RevenueAccepted : Decimal,

    // Exception Aggregation: Count distinct agencies
    @AnalyticsDetails.exceptionAggregationSteps: [{
      exceptionAggregationBehavior: #SUM,
      exceptionAggregationElements: [Agency_ID]
    }]
    @AnalyticsDetails.measureType: #CALCULATION
    @Common.Label: null @title:null
    1 as ExcAggCount : Integer,

    // Exception Aggregation: Average daily price
    @AnalyticsDetails.measureType: #BASE
    @AnalyticsDetails.exceptionAggregationSteps: [{
      exceptionAggregationBehavior: #AVG,
      exceptionAggregationElements: [ BeginDate ]
    }]
    @Measures.ISOCurrency: currency_code
    TotalPrice as AvgDailyPrice : Decimal
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

// Calendar Date Dimension with leveled hierarchy (outside service)
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
