-- Visa Customers Schema
-- Allows storing detailed tracking metrics for visa services

create table public.visa_customers (
    id uuid primary key default uuid_generate_v4(),
    customer_id text not null unique,
    monthly_count text,
    mode_of_visa text,
    customer_name text not null,
    visa_issued_date date,
    travel_date date,
    visa_expiry_date text,
    phone_contact text,
    visa_supplier text,
    email_address text,
    passport_no text,
    visa_duration text,
    amount numeric(10, 2) default 0,
    discount_agent_fees numeric(10, 2) default 0,
    receiving_amount numeric(10, 2) default 0,
    visa_fees_to_supplier numeric(10, 2) default 0,
    refund text,
    payment_method text,
    balance text,
    comments text,
    referred_by text,
    remark text,
    status text default 'Open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.visa_customers enable row level security;
create policy "Enable all actions for authenticated users" on public.visa_customers for all to authenticated using (true);
create policy "Allow public read access to visa_customers" on public.visa_customers for select using (true);
