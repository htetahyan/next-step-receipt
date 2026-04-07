-- Flight Bookings Schema (JSONB version)
-- Run this in your Supabase SQL editor

create table public.flight_bookings (
    id uuid primary key default uuid_generate_v4(),
    pnr text not null,
    issue_date date not null default current_date,

    -- Passenger
    passenger_title text not null default 'Mr.',
    passenger_name text not null,
    trip_type text not null default 'round',

    -- Flight details stored as JSONB
    -- onward_flight: { date, departureTime, arrivalTime, duration, fromCity, fromAirport, fromCode, toCity, toAirport, toCode }
    onward_flight jsonb not null default '{
      "date": null,
      "departureTime": "08:15",
      "arrivalTime": "12:30",
      "duration": "6h 45min",
      "fromCity": "Yangon",
      "fromAirport": "Mingaladon",
      "fromCode": "RGN",
      "toCity": "Dubai",
      "toAirport": "Dubai Intl Arpt",
      "toCode": "DXB"
    }'::jsonb,

    -- return_flight: same shape as onward_flight
    return_flight jsonb not null default '{
      "date": null,
      "departureTime": "14:00",
      "arrivalTime": "22:15",
      "duration": "5h 45min",
      "fromCity": "Dubai",
      "fromAirport": "Dubai Intl Arpt",
      "fromCode": "DXB",
      "toCity": "Yangon",
      "toAirport": "Mingaladon",
      "toCode": "RGN"
    }'::jsonb,

    -- Booking details
    cabin text not null default 'Economy',
    fare_type text not null default 'Non Refundable',
    checkin_baggage text not null default '25KGS (1 piece only)',
    cabin_baggage text not null default '7KGS (1 piece only)',

    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.flight_bookings enable row level security;
create policy "Enable all actions for authenticated users" on public.flight_bookings for all to authenticated using (true);
create policy "Allow public read access to flight_bookings" on public.flight_bookings for select using (true);
