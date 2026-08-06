---
name: trip-planning
description: >
  Plan a complete trip by coordinating flights, hotels, and (when relevant)
  conference event passes. Searches all domains in parallel and presents
  options to the user.
metadata:
  tags: [travel, planning, trips, flights, hotels, events]
  examples:
    - Plan a weekend trip to Paris
    - I want to visit Tokyo for 5 days
    - Book me a getaway to Barcelona next month
    - Please book a travel to next year's Sapphire in Orlando
---

# Skill: Trip Planning

## When to Use

- User asks to plan a trip, vacation, weekend getaway, or business trip.
- User mentions a destination and wants help organising travel.
- User mentions a named event ("Sapphire", "TechEd", "DKOM", "the conference next year") that the trip should be anchored on.

## Instructions

### A. Event-anchored trips (preferred when the user names an event)

If the user mentions a conference or corporate event, resolve the event FIRST
so the rest of the plan is built around its dates and city.

1. Send the event agent a single descriptive sentence, e.g.
   `"Find SAP Sapphire 2027 in Orlando, and tell me the dates, venue, and pass price."`
2. From the event agent's response take `startDate`, `endDate`, `city`, `venue`,
   and `passPrice`.
3. Build the trip period as `[startDate − 1 day, endDate + 1 day]` so the
   traveller arrives the day before and departs the day after.
4. Then run the standard parallel search using those dates and city:
   - Hotel agent — `"Find hotels in <city> for <arriveDate>–<departDate>, near <venue>."`
   - Flights MCP — call `data_describe`, then resolve airport codes via `data_query` on `Airports`, then `data_query` on `Flights` for the dates.
5. Present concrete options to the user with prices and details.
6. When the user confirms, book in this order:
   1. Hotel booking (hotel A2A agent)
   2. Event pass (event A2A agent — `bookEventPass`)
   3. Flight bookings (`data_bookFlight`)
   4. `createTravel` (HITL approval) — persists trip header + flight bookings.
7. Summarise the complete itinerary, including the new Travel ID.

### B. Generic trips (no specific event mentioned)

1. Identify the destination and dates (use reasonable defaults if not specified).
2. Search in parallel:
   - Call the hotel agent with a natural-language description of what's needed.
   - Call `data_describe` on the flights MCP, then `data_query` `Airports` for the destination's airport codes.
3. Once you have airport codes, call `data_query` on `Flights`.
4. Present options to the user with prices and details.
5. When the user decides, book hotel via the A2A agent, flights via `data_bookFlight`, then call `createTravel` (HITL approval).
6. Summarise the complete itinerary at the end.
