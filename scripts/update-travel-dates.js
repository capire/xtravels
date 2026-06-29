#!/usr/bin/env node
/**
 * update-travel-dates — refresh Travels and Bookings so they line up with
 * the (also-refreshed) flight schedule in @capire/xflights.
 *
 * Order of operations:
 *   1. Locate @capire/xflights (resolved package, workspace sibling, or
 *      ../xflights), and run its `update-flights-dates` npm script. That
 *      rewrites xflights' flight CSVs to a mix of past and future dates.
 *   2. Load the now-fresh xflights Flights CSV and partition every flight
 *      schedule entry into past / future buckets.
 *   3. For every Travel, decide which bucket its bookings belong to:
 *        - Status O (Open) and P (InReview): future-only — these trips
 *          are still upcoming.
 *        - Status A (Accepted), X (Rejected), B (Blocked): either bucket
 *          is fine — past or future, they're settled.
 *   4. For every Booking on a travel, pick a fresh (Flight_ID, Flight_date)
 *      pair from the chosen bucket. Prefer keeping the booking's existing
 *      Flight_ID if any matching scheduled instance is available; otherwise
 *      reroute to a different flight in the same bucket.
 *   5. Set Travel.BeginDate / EndDate to bracket the booking flight dates
 *      (with a 1-day pad on each side, or a 1–2 day window for single-
 *      booking travels).
 *   6. Set each Booking.BookingDate 1–30 days before the new BeginDate.
 *
 * Quoted fields with embedded commas are preserved.
 *
 * Usage: node scripts/update-travel-dates.js
 *        npm run update-travel-dates
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const DATA_DIR = path.resolve(__dirname, '..', 'db', 'data')
const TRAVELS  = path.join(DATA_DIR, 'sap.capire.travels-Travels.csv')
const BOOKINGS = path.join(DATA_DIR, 'sap.capire.travels-Bookings.csv')
const SUPPLEMENTS = path.join(DATA_DIR, 'sap.capire.travels-Bookings.Supplements.csv')

const FUTURE_ONLY_STATUSES = new Set(['O', 'P'])
const ANY_STATUSES         = new Set(['A', 'X', 'B'])

const DAY_MS = 86_400_000

const today = new Date()
today.setUTCHours(0, 0, 0, 0)

const isoDate = d => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pickRandom = arr => arr[randInt(0, arr.length - 1)]

// ---- CSV helpers ----------------------------------------------------------
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

const serializeCSV = rows => rows.map(r => r.map(cell => {
  const s = cell ?? ''
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}).join(',')).join('\n') + '\n'

function loadCSV(file) {
  const rows = parseCSV(fs.readFileSync(file, 'utf8'))
  const header = rows[0]
  const records = rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
  return { header, records }
}

const saveCSV = (file, header, records) =>
  fs.writeFileSync(file, serializeCSV([header, ...records.map(r => header.map(h => r[h] ?? ''))]))

// ---- 1. Locate xflights & run its date-shifter ---------------------------
function locateXflights() {
  // a) Standard package resolution (works in npm workspaces too)
  try {
    const pkg = require.resolve('@capire/xflights/package.json')
    return path.dirname(pkg)
  } catch { /* fall through */ }

  // b) Workspace sibling: clean-room layout is .../xtravels/.. == workspace root
  const sibling = path.resolve(__dirname, '..', '..', 'xflights')
  if (fs.existsSync(path.join(sibling, 'package.json'))) return sibling

  // c) Hoisted into a parent's node_modules
  let dir = path.resolve(__dirname, '..')
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', '@capire', 'xflights')
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
    dir = path.dirname(dir)
  }
  return null
}

const xflightsDir = locateXflights()
if (!xflightsDir) {
  console.error('ERROR: could not locate @capire/xflights — looked in node_modules and ../xflights.')
  process.exit(1)
}
console.log(`Found @capire/xflights at: ${xflightsDir}`)
console.log('Running its update-flights-dates script...')
console.log('-'.repeat(60))

const result = spawnSync('npm', ['run', 'update-flights-dates'], {
  cwd: xflightsDir,
  stdio: 'inherit'
})
if (result.status !== 0) {
  console.error('ERROR: xflights update-flights-dates failed.')
  process.exit(result.status || 1)
}
console.log('-'.repeat(60))
console.log()

// ---- 2. Load fresh flight schedule, partition by past/future -------------
const FLIGHTS_CSV = path.join(xflightsDir, 'db', 'data', 'sap.capire.flights-Flights.csv')
const flights = loadCSV(FLIGHTS_CSV)
const flightIdCol = flights.header.includes('flight_ID') ? 'flight_ID' : 'ID'

const todayIso = isoDate(today)
const flightsById = new Map() // flight_ID -> { past: [date,...], future: [date,...] }
const flightInfo  = new Map() // (flight_ID, date) -> { price, currency_code }
const allPast = []  // [{flight_ID, date}, ...]
const allFuture = []

for (const f of flights.records) {
  const id   = f[flightIdCol]
  const date = f.date
  if (!id || !date) continue
  if (!flightsById.has(id)) flightsById.set(id, { past: [], future: [] })
  const entry = flightsById.get(id)
  if (date < todayIso) { entry.past.push(date);   allPast.push({   flight_ID: id, date }) }
  else                 { entry.future.push(date); allFuture.push({ flight_ID: id, date }) }
  flightInfo.set(`${id}|${date}`, { price: f.price, currency_code: f.currency_code })
}

if (!allPast.length || !allFuture.length) {
  console.error('ERROR: xflights schedule has no past or no future entries — run the xflights script and try again.')
  process.exit(1)
}

// ---- 3 + 4. Re-bucket bookings, then re-bracket travels ------------------
const travels = loadCSV(TRAVELS)
const bookings = loadCSV(BOOKINGS)

const travelsById = new Map(travels.records.map(t => [t.ID, t]))

// Group bookings by Travel_ID for efficient processing
const bookingsByTravel = new Map()
for (const b of bookings.records) {
  if (!bookingsByTravel.has(b.Travel_ID)) bookingsByTravel.set(b.Travel_ID, [])
  bookingsByTravel.get(b.Travel_ID).push(b)
}

function pickFlight(originalFlightId, bucket, targetCurrency) {
  // bucket is 'past' | 'future' | 'any'.
  // Prefer flights whose currency matches targetCurrency — the app's
  // ASSERT_BOOKING_CURRENCY_MATCHES_TRAVEL constraint requires every
  // booking on a travel to share the travel's currency, and the value-help
  // copies the flight's currency onto the booking. Mirror that here.
  const tryBuckets = bucket === 'any'
    ? (Math.random() < 0.5 ? ['past', 'future'] : ['future', 'past'])
    : [bucket]

  const matchesCurrency = (id, date) => {
    if (!targetCurrency) return true
    const info = flightInfo.get(`${id}|${date}`)
    return info && info.currency_code === targetCurrency
  }

  // 1) Same flight ID, currency match.
  for (const b of tryBuckets) {
    const dates = flightsById.get(originalFlightId)?.[b] || []
    const matches = dates.filter(d => matchesCurrency(originalFlightId, d))
    if (matches.length) return { flight_ID: originalFlightId, date: pickRandom(matches) }
  }
  // 2) Any flight ID in the bucket, currency match.
  for (const b of tryBuckets) {
    const pool = (b === 'past' ? allPast : allFuture)
      .filter(f => matchesCurrency(f.flight_ID, f.date))
    if (pool.length) return pickRandom(pool)
  }
  // 3) Fall back to currency-agnostic same-ID match.
  for (const b of tryBuckets) {
    const dates = flightsById.get(originalFlightId)?.[b] || []
    if (dates.length) return { flight_ID: originalFlightId, date: pickRandom(dates) }
  }
  // 4) Fall back to any flight in the bucket.
  for (const b of tryBuckets) {
    const pool = (b === 'past' ? allPast : allFuture)
    if (pool.length) return pickRandom(pool)
  }
  // 5) Defensive — shouldn't reach here; both buckets are validated non-empty above.
  return pickRandom(allFuture.length ? allFuture : allPast)
}

let touchedTravels = 0
let touchedBookings = 0
let reroutedBookings = 0

for (const t of travels.records) {
  const myBookings = bookingsByTravel.get(t.ID) || []
  if (!myBookings.length) {
    // No bookings; just shift the travel's bracket using its status as a hint.
    const bucket = FUTURE_ONLY_STATUSES.has(t.Status_code) ? 'future' :
                   ANY_STATUSES.has(t.Status_code)         ? 'any'    : 'future'
    const anchor = bucket === 'past' || (bucket === 'any' && Math.random() < 0.33)
                   ? addDays(today, -randInt(1, 60))
                   : addDays(today, randInt(0, 60))
    const dur = randInt(14, 56)
    t.BeginDate = isoDate(anchor)
    t.EndDate   = isoDate(addDays(anchor, dur))
    touchedTravels++
    continue
  }

  const bucket = FUTURE_ONLY_STATUSES.has(t.Status_code) ? 'future' :
                 ANY_STATUSES.has(t.Status_code)         ? 'any'    : 'future'

  // For 'any' status: settle on one direction so all bookings on this
  // travel share the bucket — keeps the bracket coherent.
  const settledBucket = bucket === 'any'
    ? (Math.random() < 0.33 ? 'past' : 'future')
    : bucket

  // Re-pick each booking
  const flightDates = []
  for (const b of myBookings) {
    const before = `${b.Flight_ID}|${b.Flight_date}`
    const picked = pickFlight(b.Flight_ID, settledBucket, t.Currency_code)
    if (picked.flight_ID !== b.Flight_ID) reroutedBookings++
    b.Flight_ID  = picked.flight_ID
    b.Flight_date = picked.date
    // Mirror the app's value-help behaviour: when a flight is selected,
    // FlightPrice and Currency_code are copied from the chosen flight row.
    const info = flightInfo.get(`${picked.flight_ID}|${picked.date}`)
    if (info) {
      b.FlightPrice   = info.price
      b.Currency_code = info.currency_code
    }
    flightDates.push(picked.date)
    touchedBookings++
  }

  // Set the Travel bracket to span all flight dates with a 1-day pad each side.
  flightDates.sort()
  const first = new Date(flightDates[0])
  const last  = new Date(flightDates[flightDates.length - 1])
  const begin = addDays(first, -1)
  const end   = addDays(last, randInt(1, 3))
  t.BeginDate = isoDate(begin)
  t.EndDate   = isoDate(end)

  // BookingDate: 1–30 days before BeginDate
  for (const b of myBookings) {
    b.BookingDate = isoDate(addDays(begin, -randInt(1, 30)))
  }

  touchedTravels++
}

saveCSV(TRAVELS, travels.header, travels.records)
saveCSV(BOOKINGS, bookings.header, bookings.records)

// ---- 5. Recompute Travels.TotalPrice -------------------------------------
// Mirrors the app's update_totals handler:
//   TotalPrice = BookingFee + Σ Bookings.FlightPrice + Σ Bookings.Supplements.Price
const supplements = fs.existsSync(SUPPLEMENTS) ? loadCSV(SUPPLEMENTS) : { records: [] }
const supplementSumByTravel = new Map()
for (const s of supplements.records) {
  const t = s.up__Travel_ID
  if (!t) continue
  supplementSumByTravel.set(t, (supplementSumByTravel.get(t) || 0) + Number(s.Price || 0))
}
const flightSumByTravel = new Map()
for (const b of bookings.records) {
  flightSumByTravel.set(b.Travel_ID,
    (flightSumByTravel.get(b.Travel_ID) || 0) + Number(b.FlightPrice || 0))
}
let touchedTotals = 0
for (const t of travels.records) {
  const fee = Number(t.BookingFee || 0)
  const flights = flightSumByTravel.get(t.ID) || 0
  const supps   = supplementSumByTravel.get(t.ID) || 0
  const total = fee + flights + supps
  // CSV expresses Decimal(9,4) as plain numbers — keep it tidy.
  t.TotalPrice = Number.isInteger(total) ? String(total) : total.toFixed(4).replace(/\.?0+$/, '')
  touchedTotals++
}
saveCSV(TRAVELS, travels.header, travels.records)

// ---- 6. Report -----------------------------------------------------------
console.log(`Updated ${touchedTravels} travels.`)
console.log(`Updated ${touchedBookings} bookings (${reroutedBookings} rerouted to a different Flight_ID).`)
console.log(`Recomputed ${touchedTotals} TotalPrice values.`)
console.log(`Anchor date: ${todayIso}.`)
console.log()
console.log('NOTE: db/data/sap.capire.travels-Travels.csv and -Bookings.csv (and the')
console.log('xflights CSVs they depend on) have been rewritten in place. These changes')
console.log('are for your local development only — please do NOT commit them back to git.')
