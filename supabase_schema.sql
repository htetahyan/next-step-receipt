-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create Customers Table
create table public.customers (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    email text,
    phone text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Invoices Table
create table public.invoices (
    id uuid primary key default uuid_generate_v4(),
    customer_id uuid references public.customers(id) on delete restrict,
    invoice_number text not null unique,
    date date not null,
    subtotal numeric(10, 2) not null default 0,
    vat_amount numeric(10, 2) not null default 0,
    total_amount numeric(10, 2) not null default 0,
    payment_method text not null, -- e.g. 'cash', 'card', 'bank_transfer', 'tabby'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Invoice Items Table
create table public.invoice_items (
    id uuid primary key default uuid_generate_v4(),
    invoice_id uuid references public.invoices(id) on delete cascade,
    description text not null,
    quantity numeric(10, 2) not null default 1,
    rate numeric(10, 2) not null,
    amount numeric(10, 2) not null
);

-- Set up Row Level Security (RLS)
-- Since it's for internal use, we can restrict access to authenticated users only.
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- Create policies (allowing all authenticated users to do everything)
create policy "Enable all actions for authenticated users" on public.customers for all to authenticated using (true);
create policy "Enable all actions for authenticated users" on public.invoices for all to authenticated using (true);
create policy "Enable all actions for authenticated users" on public.invoice_items for all to authenticated using (true);

-- (Optional) If you want the customer portal to be public without login:
create policy "Allow public read access to invoices" on public.invoices for select using (true);
create policy "Allow public read access to items" on public.invoice_items for select using (true);
-- Create Settings Table
create table public.settings (
    id uuid primary key default uuid_generate_v4(),
    company_name text not null default 'NextStep Travel & Tourism FZC LLC',
    company_address text not null default 'Office No 4B, 3rd Floor IBIS Hotel Business Center, Al Rigga, Deira Dubai, United Arab Emirates',
    bank_name text not null default 'Mashreq Bank',
    bank_branch text not null default 'Deira, Dubai',
    bank_iban text not null default 'AE300330000019101789314',
    bank_account_no text not null default '019101789314',
    user_id uuid references auth.users(id) on delete cascade unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settings enable row level security;
create policy "Users can view their own settings" on public.settings for select to authenticated using (auth.uid() = user_id);
create policy "Users can update their own settings" on public.settings for update to authenticated using (auth.uid() = user_id);
create policy "Users can insert their own settings" on public.settings for insert to authenticated with check (auth.uid() = user_id);

