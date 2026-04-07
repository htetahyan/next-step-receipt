-- Hotel Bookings Schema
-- Run this in your Supabase SQL editor

create table public.hotel_bookings (
    id uuid primary key default uuid_generate_v4(),
    booking_id text not null,
    booking_date date not null default current_date,

    -- Hotel Details
    hotel_name text not null default 'Park Regis Kris Kin Hotel',
    hotel_address text not null default 'Sheikh Khalifa Bin Zayed St - opp. Burjuman Center - Bur Dubai - Dubai - United Arab Emirates',
    
    -- Booking Details
    check_in date not null,
    check_out date not null,
    total_nights integer not null default 1,
    no_of_rooms integer not null default 1,

    -- Guest & Room
    room_type_board text not null default 'Standard Single Room',
    guest_name text not null,
    adults integer not null default 1,
    children integer not null default 0,
    infants integer not null default 0,

    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.hotel_bookings enable row level security;
create policy "Enable all actions for authenticated users" on public.hotel_bookings for all to authenticated using (true);
create policy "Allow public read access to hotel_bookings" on public.hotel_bookings for select using (true);
