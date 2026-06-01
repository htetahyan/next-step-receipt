-- Migration 004: Add reference_id to customer_services and service_id to customer_documents
-- Run this in your Supabase SQL editor

-- 1. Add reference_id for spreadsheet IDs (AE0001, TK0001, etc.)
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- 2. Add service_id to customer_documents so docs can attach to specific services
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES customer_services(id) ON DELETE SET NULL;

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_services_reference_id ON customer_services(reference_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON customer_services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON customer_services(status);
CREATE INDEX IF NOT EXISTS idx_documents_service_id ON customer_documents(service_id);

-- 4. Add index on customers passport for dedup lookups
CREATE INDEX IF NOT EXISTS idx_customers_passport ON customers(passport_no);
