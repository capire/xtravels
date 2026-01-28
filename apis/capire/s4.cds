using { API_BUSINESS_PARTNER as S4 } from '@capire/s4';
namespace sap.capire.s4;

@federated entity Customers as projection on S4.A_BusinessPartner {
  BusinessPartner as ID,
  PersonFullName  as Name,
  LastChangeDate  as modifiedAt,
  // Not supported by OData, and not used in XTravels so far...
  // to_BusinessPartnerAddress[1:].{
  //   StreetName                                            as Street,
  //   POBoxPostalCode                                       as PostalCode,
  //   CityName                                              as City,
  //   Country                                               as Country,
  //   to_PhoneNumber[1:IsDefaultPhoneNumber].PhoneNumber    as PhoneNumber,
  //   to_EmailAddress[1:IsDefaultEmailAddress].EmailAddress as EmailAddress,
  // },
} where BusinessPartnerCategory == 1; // 1 = Person
