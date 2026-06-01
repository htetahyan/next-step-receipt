-- Migration: Update flight_bookings JSONB defaults to include airlineName & airlineLogo
-- NOTE: Since onward_flight and return_flight are JSONB columns, new keys (airlineName, airlineLogo)
-- are automatically supported without ALTER TABLE. This migration only updates the DEFAULT values.
-- Run this in your Supabase SQL editor.

-- Update default for onward_flight
ALTER TABLE public.flight_bookings
ALTER COLUMN onward_flight SET DEFAULT '{
  "date": null,
  "departureTime": "08:15",
  "arrivalTime": "12:30",
  "duration": "6h 45min",
  "fromCity": "Yangon",
  "fromAirport": "Mingaladon",
  "fromCode": "RGN",
  "toCity": "Dubai",
  "toAirport": "Dubai Intl Arpt",
  "toCode": "DXB",
  "airlineName": "Myanmar Airways Intl",
  "airlineLogo": "/flightbooking/Myanmar-Airways-International-Logo.png"
}'::jsonb;

-- Update default for return_flight
ALTER TABLE public.flight_bookings
ALTER COLUMN return_flight SET DEFAULT '{
  "date": null,
  "departureTime": "14:00",
  "arrivalTime": "22:15",
  "duration": "5h 45min",
  "fromCity": "Dubai",
  "fromAirport": "Dubai Intl Arpt",
  "fromCode": "DXB",
  "toCity": "Yangon",
  "toAirport": "Mingaladon",
  "toCode": "RGN",
  "airlineName": "Myanmar Airways Intl",
  "airlineLogo": "/flightbooking/Myanmar-Airways-International-Logo.png"
}'::jsonb;

-- Optionally backfill existing rows that don't have airline info:
-- UPDATE public.flight_bookings
-- SET onward_flight = onward_flight || '{"airlineName": "Myanmar Airways Intl", "airlineLogo": "/flightbooking/Myanmar-Airways-International-Logo.png"}'::jsonb
-- WHERE onward_flight->>'airlineName' IS NULL;
--
-- UPDATE public.flight_bookings
-- SET return_flight = return_flight || '{"airlineName": "Myanmar Airways Intl", "airlineLogo": "/flightbooking/Myanmar-Airways-International-Logo.png"}'::jsonb
-- WHERE return_flight->>'airlineName' IS NULL;
