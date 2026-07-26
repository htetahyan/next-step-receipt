-- Performance Indexes Migration for Next-Receipt App
-- Speeds up search queries, filters, foreign key joins, and sorting operations

-- 1. Customers Table Indexes (Fast search by passport, name, phone, email)
CREATE INDEX IF NOT EXISTS idx_customers_passport_no ON public.customers (passport_no);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);

-- 2. Customer Services Table Indexes (Fast lookup by customer, reference_id, category, status, created_at)
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON public.customer_services (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_reference_id ON public.customer_services (reference_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_category ON public.customer_services (category);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON public.customer_services (status);
CREATE INDEX IF NOT EXISTS idx_customer_services_created_at ON public.customer_services (created_at DESC);

-- 3. Invoices Table Indexes (Fast lookup by customer, invoice_number, created_at)
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at DESC);

-- 4. Customer Documents Table Indexes (Fast document fetching per customer / service)
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON public.customer_documents (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_service_id ON public.customer_documents (service_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_created_at ON public.customer_documents (created_at DESC);
