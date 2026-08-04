using { API_BUSINESS_PARTNER as S4 } from '@capire/s4';
namespace sap.capire.s4;

@federated entity Customers as projection on S4.A_BusinessPartner {

  BusinessPartner as ID,
  PersonFullName  as Name,
  // FirstName       as FirstName,
  // LastName        as LastName,
  LastChangeDate  as modifiedAt,
  LastChangeTime  as modifiedAtTime,

  // Not supported by resolveView yet - commented out for now
  // IsMale ? 'Mr. ' : IsFemale ? 'Ms. ' : '' as Salutation,
  // PersonFullName ? PersonFullName : FirstName || ' ' || LastName  as Name,
  // LastChangeDate || 'T' || LastChangeTime || 'Z' as modifiedAt,

  // Not supported by OData, and not used in XTravels so far...
  // to_BusinessPartnerAddress[1:].{
  //   StreetName                                            as Street,
  //   POBoxPostalCode                                       as PostalCode,
  //   CityName                                              as City,
  //   Country                                               as Country,
  // },

} where BusinessPartnerCategory == '1'; // '1' = Person
