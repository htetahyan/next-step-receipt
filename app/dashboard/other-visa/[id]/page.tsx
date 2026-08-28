import { createClient } from '@/utils/supabase/server';
import OtherVisaForm from '../new/other-visa-form';
import { notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/users';

export default async function EditOtherVisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  const { data: service } = await supabase
    .from('customer_services')
    .select('*, customers(id, name, phone, passport_no, email)')
    .eq('id', id)
    .single();

  if (!service) {
    notFound();
  }

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, passport_no, phone')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return (
    <>
      <OtherVisaForm customers={customers} initialData={service} currentUser={currentUser} />
    </>
  );
}
