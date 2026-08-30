import { createClient } from '@/utils/supabase/server';
import CustomServiceForm from './custom-service-form';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';

export default async function NewCustomServicePage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  if (!checkPermission(currentUser, 'custom_service', 'create')) {
    redirect('/dashboard');
  }

  let customers: any[] = [];
  try {
    const { data: customerData } = await supabase
      .from('customers')
      .select('id, name, passport_no, phone')
      .order('created_at', { ascending: false })
      .limit(100);
    if (customerData) customers = customerData;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  let suppliers: any[] = [];
  try {
    const { data: supData } = await supabase
      .from('suppliers')
      .select('id, name, services')
      .order('name', { ascending: true });
    if (supData) suppliers = supData;
  } catch (e) {
    console.error('Failed to fetch suppliers:', e);
  }

  return (
    <CustomServiceForm 
      customers={customers} 
      suppliers={suppliers} 
      currentUser={currentUser} 
    />
  );
}
