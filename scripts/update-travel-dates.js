#!/usr/bin/env node
/**
 * update-travel-dates — refresh seed CSV dates so a freshly seeded app
 * shows current data instead of trips that ended years ago.
 *
 *   1. Every Travel with Status_code = 'O' (Open) gets a fresh BeginDate
 *      strictly before today and EndDate strictly after today, with a
 *      random duration in [14, 56] days.
 *   2. Every Booking belonging to such a travel gets a Flight_date that
 *      falls inside the new bracket, and a BookingDate that falls 1-30
 *      days before the BeginDate.
 *
 * Closed and accepted travels are intentionally left untouched — they
 * represent completed trips and belong in the past where they are.
 *
 * The CSVs in db/data/ are rewritten in place. Quoted fields with
 * embedded commas are preserved.
 *
 * Usage: node scripts/update-travel-dates.js
 *        npm run update-travel-dates
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(__dirname, '..', 'db', 'data')
const TRAVELS  = path.join(DATA_DIR, 'sap.capire.travels-Travels.csv')
const BOOKINGS = path.join(DATA_DIR, 'sap.capire.travels-Bookings.csv')

const MIN_DURATION_DAYS = 14
const MAX_DURATION_DAYS = 56

const DAY_MS = 86_400_000

const today = new Date()
today.setUTCHours(0, 0, 0, 0)

const isoDate = d => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Tiny CSV parser: handles quoted fields with embedded commas. Doesn't
// pretend to handle every RFC-4180 corner; it doesn't need to.
function parseCSV(text) {
  const rows = []
  let row = [], cur = '', inQuote = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = false
      } else cur += ch
    } else {
      if (ch === '"') inQuote = true
      else if (ch === ',') { row.push(cur); cur = '' }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (ch === '\r') { /* skip */ }
      else cur += ch
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '')
    rows.pop()
  return rows
}

function serializeCSV(rows) {
  return rows.map(r => r.map(cell => {
    const s = cell ?? ''
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }).join(',')).join('\n') + '\n'
}

function loadCSV(file) {
  const rows = parseCSV(fs.readFileSync(file, 'utf8'))
  const header = rows[0]
  const records = rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
  return { header, records }
}

function saveCSV(file, header, records) {
  const rows = [header, ...records.map(r => header.map(h => r[h] ?? ''))]
  fs.writeFileSync(file, serializeCSV(rows))
}

function pickInProgressBracket() {
  const duration = randInt(MIN_DURATION_DAYS, MAX_DURATION_DAYS)
  const offsetBefore = randInt(1, duration - 1)
  const begin = addDays(today, -offsetBefore)
  const end   = addDays(begin, duration)
  return { begin, end }
}

const travels = loadCSV(TRAVELS)
const updated = new Map()

for (const t of travels.records) {
  if (t.Status_code !== 'O') continue
  const { begin, end } = pickInProgressBracket()
  t.BeginDate = isoDate(begin)
  t.EndDate   = isoDate(end)
  updated.set(t.ID, { begin, end })
}

saveCSV(TRAVELS, travels.header, travels.records)

const bookings = loadCSV(BOOKINGS)
let touchedBookings = 0

for (const b of bookings.records) {
  const bracket = updated.get(b.Travel_ID)
  if (!bracket) continue
  const { begin, end } = bracket
  const span = Math.round((end.getTime() - begin.getTime()) / DAY_MS)
  const flightOffset = randInt(0, span)
  const flightDate   = addDays(begin, flightOffset)
  const bookingDate  = addDays(begin, -randInt(1, 30))
  b.Flight_date = isoDate(flightDate)
  b.BookingDate = isoDate(bookingDate)
  touchedBookings++
}

saveCSV(BOOKINGS, bookings.header, bookings.records)

console.log(`Updated ${updated.size} open travels (status 'O').`)
console.log(`Updated ${touchedBookings} bookings within those travels.`)
console.log(`Anchor date: ${isoDate(today)}.`)
console.log()
console.log('NOTE: db/data/sap.capire.travels-Travels.csv and -Bookings.csv have been')
console.log('rewritten in place. These changes are for your local development only —')
console.log('please do NOT commit them back to git. Use `git restore db/data/...` to')
console.log('discard them when you no longer need the refreshed dates.')
