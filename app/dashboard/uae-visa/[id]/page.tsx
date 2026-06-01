import { createClient } from '@/utils/supabase/server';
import UAEVisaForm from '../new/uae-visa-form';
import { notFound } from 'next/navigation';

export default async function EditUAEVisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the existing service record
  const { data: service } = await supabase
    .from('customer_services')
    .select('*, customers(id, name, phone, passport_no, email)')
    .eq('id', id)
    .single();

  if (!service) {
    notFound();
  }

  // Fetch customers for the dropdown (although we disable changing customer in edit mode, the form still expects it)
  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no, email')
      .order('name', { ascending: true });
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return (
    <>
      <UAEVisaForm customers={customers} initialData={service} />
      {/* We can add a DocumentModal trigger here later if needed */}
    </>
  );
}
