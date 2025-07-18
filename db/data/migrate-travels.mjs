/* eslint-disable no-console */
import cds from '@sap/cds'
import fs from 'node:fs'

const { local } = cds.utils, { DIMMED, RESET } = cds.utils.colors
const sflight = process.argv[2] === '--from' ? process.argv[3] : cds.error `Usage: migrate.mjs --from <sflight-home-dir>`
const namespace = 'sap.capire.travels'
await cds.deploy(sflight+'/app')
const ET_ = {

  Travels:
    SELECT.from `sap.fe.cap.travel.Travel {
      TravelID as ID,
      Description,
      BeginDate,
      EndDate,
      BookingFee,
      TotalPrice,
      CurrencyCode_code as Currency_code,
      TravelStatus_code as Status_code,
      to_Agency_AgencyID as Agency_ID,
      to_Customer_CustomerID as Customer_ID,
      createdAt,
      createdBy,
      LastChangedAt as modifiedAt,
      LastChangedBy as modifiedBy,
    }`,

  Bookings:
    SELECT.from `sap.fe.cap.travel.Booking {
      to_Travel.TravelID as Travel_ID,
      BookingID as Pos,
      BookingDate,
      to_Carrier.AirlineID || ConnectionID as Flight_ID,
      FlightDate as Flight_date,
      FlightPrice,
      CurrencyCode_code as Currency_code,
    }`
    .then (rows => rows.map (r => {
      if (r.Flight_ID in { EA0018:1, FA0018:1, OC0018:1, SW0018:1 })
        r.Flight_date = date4 (r.Flight_date, +7 *days)
      return r
    })),

  'Bookings.Supplements':
    SELECT.from `sap.fe.cap.travel.BookingSupplement {
      BookSupplUUID as ID,
      to_Travel.TravelID as up__Travel_ID,
      to_Booking.BookingID as up__Pos,
      to_Supplement.SupplementID as booked_ID,
      Price,
      CurrencyCode_code as Currency_code,
    }`
}


const hours = 1000*60*60
const days = 24 * hours
const date4 = (date,delta) => new Date (
  new Date(`${date}/00:00:00Z`).getTime() + delta
).toISOString().slice(0,10)

const quoted = x => {
  if (typeof x === 'string') {
    if (x.startsWith('"') && x.endsWith('"')) return x // already quoted
    if (x.endsWith(',')) x = x.slice(0, -1) // remove trailing comma
    if (x.includes(',') || x.includes('\n')) return `"${x.replace(/"/g,'""')}"`
  }
  return x
}

await Promise.all (Object.entries(ET_).map(async ([ key, rows ]) => {
  const file = import.meta.dirname + '/' + `${namespace}-${key}.csv`
  console.log('  extracting to:', DIMMED + local(file), RESET)
  let csv = fs.createWriteStream (file), i=0
  for (let r of await rows) {
    if (i++ === 0) csv.write (Object.keys(r).join(',') +'\n')
    csv.write (Object.values(r).map(quoted).join(',') +'\n')
  }
  csv.end()
}))
console.log()
