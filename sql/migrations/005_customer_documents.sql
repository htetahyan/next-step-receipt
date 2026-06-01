create table public.customer_documents (
    id uuid primary key default uuid_generate_v4(),
    customer_ref_id text not null, -- Stores either the visa_customers.customer_id or customers.id
    customer_type text not null, -- 'visa' or 'standard'
    title text not null,
    file_url text not null,
    file_key text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.customer_documents enable row level security;
create policy "Enable all actions for authenticated users" on public.customer_documents for all to authenticated using (true);
create policy "Allow public read access to customer_documents" on public.customer_documents for select using (true);
