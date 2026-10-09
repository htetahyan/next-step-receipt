-- Suppliers and rate cards had row security on and no policies,
-- so signed-in staff could not read or save them.
-- Existing supplier and rate rows are not changed.

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_staff_all" ON public.suppliers;
DROP POLICY IF EXISTS "rate_cards_staff_all" ON public.rate_cards;

CREATE POLICY "suppliers_staff_all"
ON public.suppliers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "rate_cards_staff_all"
ON public.rate_cards
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
