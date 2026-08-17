import { createClient } from '@/utils/supabase/server';
import AirTicketForm from '../new/air-ticket-form';
import { notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/users';

export default async function EditAirTicketPage({ params }: { params: Promise<{ id: string }> }) {
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
  let suppliers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no, email')
      .order('name', { ascending: true });
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
      <AirTicketForm 
        customers={customers} 
        suppliers={suppliers} 
        initialData={service} 
        currentUser={currentUser} 
      />
    </>
  );
}
