-- Recreate staff "all actions" policies with an explicit insert check.
-- A policy that only has USING can reject new rows.
-- Public read policies and existing data are left as they are.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'customer_services',
    'customers',
    'flight_bookings',
    'hotel_bookings',
    'invoice_items',
    'invoices',
    'user_profiles',
    'visa_customers'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Enable all actions for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
