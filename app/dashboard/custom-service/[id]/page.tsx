import { createClient } from '@/utils/supabase/server';
import CustomServiceForm from '../new/custom-service-form';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';

export default async function EditCustomServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  if (!checkPermission(currentUser, 'custom_service', 'edit')) {
    redirect('/dashboard');
  }

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

  let suppliers: any[] = [];
  try {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, services')
      .order('name', { ascending: true });
    if (data) suppliers = data;
  } catch (e) {
    console.error('Failed to fetch suppliers:', e);
  }

  return (
    <CustomServiceForm 
      customers={customers} 
      suppliers={suppliers} 
      initialData={service} 
      currentUser={currentUser} 
    />
  );
}
