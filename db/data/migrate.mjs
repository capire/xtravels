/* eslint-disable no-console */
import cds from '@sap/cds'
import fs from 'node:fs'

const sflight = process.argv[2] === '--from' ? process.argv[3] : cds.error `Usage: migrate.mjs --from <sflight-home-dir>`
await cds.deploy(sflight+'/app')
let csv

let bookings = await SELECT.from `sap.fe.cap.travel.Booking {
  to_Travel.TravelUUID as Travel_ID,
  BookingID,
  BookingDate,
  ConnectionID as Flight_connection_ID,
  FlightDate as Flight_flightDate,
  FlightPrice,
  CurrencyCode_code as Currency_code,
}`

csv = fs.createWriteStream (import.meta.dirname + '/sap.capire.travels-Bookings.csv')
csv.write('Travel_ID,BookingID,BookingDate,Flight_connection_ID,Flight_flightDate,FlightPrice,Currency_code\n')
for (let b of bookings) csv.write(
  b.Travel_ID +','+
  b.BookingID +','+
  b.BookingDate +','+
  b.Flight_connection_ID +','+
  b.Flight_flightDate +','+
  b.FlightPrice +','+
  b.Currency_code +'\n'
)
csv.end()


let supplements = await SELECT.from `sap.fe.cap.travel.BookingSupplement {
  BookSupplUUID as ID,
  to_Travel.TravelUUID as up__Travel_ID,
  to_Booking.BookingID as up__BookingID,
  to_Supplement.SupplementID as booked_ID,
  Price,
  CurrencyCode_code as Currency_code,
}`

csv = fs.createWriteStream (import.meta.dirname + '/sap.capire.travels-Supplements.csv')
csv.write('ID,up__Travel_ID,up__BookingID,booked_ID,Price,Currency_code\n')
for (let s of supplements) csv.write(
  s.ID +','+
  s.up__Travel_ID +','+
  s.up__BookingID +','+
  s.booked_ID +','+
  s.Price +','+
  s.Currency_code +'\n'
)
csv.end()
