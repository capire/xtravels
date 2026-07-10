---
name: flight-booking
description: >
  Search, book, and cancel flights via the xflights MCP server.
  Resolves airport codes, queries available flights, and confirms reservations.
metadata:
  tags: [flights, booking, mcp, airlines, airports]
  examples:
    - What flights are available from New York to Paris?
---

# Skill: Flight Booking

## When to Use

- User wants to search, book, or cancel a flight
- User mentions departure/arrival cities or airport codes
- A trip plan needs concrete flight options

## Instructions

1. Always call `data_describe` on the flights MCP first to learn the schema. The Flights entity is a denormalized view — field names differ from naive guesses.
2. Resolve city names to airport codes by calling `data_query` against the `Airports` entity (e.g. "Paris" → CDG, ORY).
3. Call `data_query` against the `Flights` entity, filtered by departure/arrival airports and date.
4. Present options with airline, flight ID, time, and price.
5. When the user confirms, call `data_bookFlight` with `{ flight, date, passenger, seats }`.
6. To cancel an existing booking, call `data_cancelFlight` with the booking ID.

## Notes

- The flights MCP tools are prefixed with `data_` so they don't collide with locally-generated CDS tools — always use the prefixed names.
- Do not invent airport codes — always verify them by querying the Airports entity.
- If a query fails with a schema error, re-read the output of `data_describe` and retry with the correct field names.
