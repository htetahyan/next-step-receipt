import { createClient } from '@/utils/supabase/server';
import CustomServiceList from './custom-service-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { UAE_VISA_CATEGORIES, AIR_TICKET_CATEGORIES, OTHER_VISA_CATEGORIES } from '@/lib/service-constants';

export default async function CustomServicePage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'custom_service', 'read')) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const predefinedCategories = [
    ...UAE_VISA_CATEGORIES,
    ...AIR_TICKET_CATEGORIES,
    ...OTHER_VISA_CATEGORIES,
    'Tour Package'
  ];

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('id, reference_id, customer_id, category, status, details, financials, created_at, customers!inner(id, name, passport_no, phone)')
      .not('category', 'in', `(${predefinedCategories.map(c => `"${c}"`).join(',')})`)
      .order('created_at', { ascending: false });
    if (data) services = data;
  } catch (e) {
    console.error('Failed to fetch custom services:', e);
  }

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return <CustomServiceList initialServices={services} customers={customers} profile={profile} />;
}
