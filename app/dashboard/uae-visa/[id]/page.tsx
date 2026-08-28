import { createClient } from '@/utils/supabase/server';
import UAEVisaForm from '../new/uae-visa-form';
import { notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/users';

export default async function EditUAEVisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  // Fetch the existing service record
  const { data: service } = await supabase
    .from('customer_services')
    .select('*, customers(id, name, phone, passport_no, email)')
    .eq('id', id)
    .single();

  if (!service) {
    notFound();
  }

  let customers: any[] = [];
  let suppliers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, passport_no, phone')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) customers = data;

    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('id, name, services')
      .order('name', { ascending: true });
    if (supplierData) suppliers = supplierData;
  } catch (e) {
    console.error('Failed to fetch data:', e);
  }

  return (
    <>
      <UAEVisaForm customers={customers} suppliers={suppliers} initialData={service} currentUser={currentUser} />
    </>
  );
}
