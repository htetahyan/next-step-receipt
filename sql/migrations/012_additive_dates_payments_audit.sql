-- Additive only. Does not update details JSON or created_at.
-- Safe to run more than once.

ALTER TABLE public.customer_services
  ADD COLUMN IF NOT EXISTS booking_date date,
  ADD COLUMN IF NOT EXISTS issued_date date,
  ADD COLUMN IF NOT EXISTS travel_date date,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.service_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.customer_services(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid,
  actor_id uuid,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_services_created_at_active
  ON public.customer_services (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_payments_service_id
  ON public.service_payments (service_id, paid_on DESC);

-- Fill empty columns from JSON. Invalid dates are skipped.
-- details and created_at are not modified.
CREATE OR REPLACE FUNCTION public.try_date(raw text) RETURNS date
LANGUAGE plpgsql AS $$
BEGIN
  IF raw IS NULL OR raw !~ '^\d{4}-\d{2}-\d{2}' THEN
    RETURN NULL;
  END IF;
  RETURN raw::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

UPDATE public.customer_services
SET issued_date = public.try_date(details->>'visa_issued_date')
WHERE issued_date IS NULL
  AND public.try_date(details->>'visa_issued_date') IS NOT NULL;

UPDATE public.customer_services
SET booking_date = public.try_date(details->>'booking_date')
WHERE booking_date IS NULL
  AND public.try_date(details->>'booking_date') IS NOT NULL;

UPDATE public.customer_services
SET travel_date = public.try_date(details->>'travel_date')
WHERE travel_date IS NULL
  AND public.try_date(details->>'travel_date') IS NOT NULL;
