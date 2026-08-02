using { API_BUSINESS_PARTNER as S4 } from '@capire/s4';
namespace sap.capire.s4;

extend S4.A_BusinessPartner with {
  PrimaryAddress: Association to S4.A_BusinessPartnerAddress
    on BusinessPartner = PrimaryAddress.BusinessPartner
    and ( PrimaryAddress.ValidityStartDate is null or PrimaryAddress.ValidityStartDate >= $now );
};

@federated entity Customers as projection on S4.A_BusinessPartner {

  BusinessPartner as ID,
  PersonFullName  as Name,
  FirstName       as FirstName,
  LastName        as LastName,
  LastChangeDate  as modifiedAt,
  LastChangeTime  as modifiedAtTime,
  PrimaryAddress.{
    CityName as City,
    Country as Country
  },

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
  //   to_PhoneNumber[1:IsDefaultPhoneNumber].PhoneNumber    as PhoneNumber,
  //   to_EmailAddress[1:IsDefaultEmailAddress].EmailAddress as EmailAddress,
  // },

} where BusinessPartnerCategory == '1'; // '1' = Person
