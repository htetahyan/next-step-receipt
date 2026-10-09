-- Tables with row security and no policy reject every signed-in write.
-- Settings was limited to the one user who created the row, so other staff
-- could not read the company name on invoices or save settings.
-- No existing rows are updated.

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_staff_all" ON public.audit_events;
DROP POLICY IF EXISTS "service_payments_staff_all" ON public.service_payments;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.settings;
DROP POLICY IF EXISTS "settings_staff_all" ON public.settings;

CREATE POLICY "audit_events_staff_all"
ON public.audit_events
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "service_payments_staff_all"
ON public.service_payments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "settings_staff_all"
ON public.settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
