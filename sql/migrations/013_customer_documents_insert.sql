-- Let signed-in staff add, update, and delete customer documents.
-- Does not change existing document rows.

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.customer_documents;
DROP POLICY IF EXISTS "customer_documents_staff_all" ON public.customer_documents;

CREATE POLICY "customer_documents_staff_all"
ON public.customer_documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
