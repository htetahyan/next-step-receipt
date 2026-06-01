-- Migration to unify customers and use JSONB for services

-- 1. Enhance the existing customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS passport_no text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Create the unified customer_services table
CREATE TABLE IF NOT EXISTS public.customer_services (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.customers(id) on delete cascade,
    category text not null, -- 'Passport Renew', 'UAE Visit Visa', 'Visa Extension A2A', etc.
    status text not null default 'Open',
    details jsonb not null default '{}'::jsonb,
    financials jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.customer_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.customer_services;
CREATE POLICY "Enable all actions for authenticated users" ON public.customer_services FOR ALL TO authenticated USING (true);

-- 3. Ensure customer_documents exists or update it
CREATE TABLE IF NOT EXISTS public.customer_documents (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references public.customers(id) on delete cascade,
    tag text,
    title text not null,
    file_url text not null,
    file_key text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Try to alter in case it existed but we missed columns
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE public.customer_documents ADD COLUMN customer_id uuid references public.customers(id) on delete cascade;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.customer_documents ADD COLUMN tag text;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

