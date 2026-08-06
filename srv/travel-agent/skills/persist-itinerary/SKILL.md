---
name: persist-itinerary
description: >
  Persist a fully-confirmed travel itinerary into the xtravels database via
  the TravelAgentService `createTravel` action — gated by a human-in-the-loop
  approval.
metadata:
  tags: [persistence, travel, hitl, createTravel, write-back]
  examples:
    - Save this trip to my account
    - Confirm and book the whole itinerary
    - Yes, go ahead and create the travel record
---

# Skill: Persist Itinerary (HITL)

## When to Use

- All component bookings (flights, hotel, event pass) are confirmed.
- The user has explicitly agreed to the complete plan.
- A Travels record should appear in the xtravels Fiori UI for this trip.

## Instructions

1. Make sure the trip header is fully specified: `Description`, `Customer` (BusinessPartner ID — query `Customers` if you don't have one; for the demo, Theresia Buchholm is `000001`), and a non-empty `Bookings` array. The travel agency is set server-side to "AI Agency" — do NOT pass an `Agency` field. The trip period is derived from the bookings — do NOT pass `BeginDate` or `EndDate`.
2. Each booking must include `Flight` (the flight ID, e.g. "SW0001"), `FlightDate` (YYYY-MM-DD), `FlightPrice`, and `Currency`. Use the prices from your earlier `data_query` results — don't invent them. Pay attention to the YEAR of each `FlightDate`; the trip period is computed from these so a wrong year here breaks the booking.
3. Before calling the tool, send a short message to the user that summarizes what is about to happen: "I'm about to save the trip to Paris (2026-07-04 → 2026-07-06), customer 000001, total flight cost €450. Approve to persist."
4. Call `createTravel`. The plugin will pause the task and ask the user to approve or reject. The next user message decides:
   - **approve** → the write happens; the response includes the new Travel ID, Description, BeginDate, EndDate. Confirm to the user with that ID.
   - **reject** → do NOT retry. Apologize, ask what they'd like to change, and adjust the plan.

## Notes

- `createTravel` is a CAP action on `TravelAgentService` exposed as a tool by the plugin. It runs in-process inside the xtravels app on :4004 — no HTTP call, no port.
- All travels you persist are attributed to the in-house **AI Agency**. The agency ID is hard-coded server-side; it is not a tool parameter and never needs to be asked of the user.
- The trip period is computed server-side as `[min(FlightDate) − 1 day, max(FlightDate) + 1 day]`. You don't pass it, and any BeginDate / EndDate you might compute in your prose is for user comprehension only — it never reaches the action.
- Only persist the flight bookings here. Hotel and event-pass bookings already live in the xhotels DB on :4006 (separate domain, separate ownership).
- The returned Travel record is in `Status='O'` (Open). The user can still edit it through the Fiori UI, accept it, or delete it.
