import { createClient } from '@/utils/supabase/server';
import OtherVisaList from './other-visa-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';

export default async function OtherVisaPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'other_visa', 'read')) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const categories = [
    'Schengen / EU Visa', 'Japan Visa', 'China Visa', 'Korea Visa',
    'Armenia Visa', 'UK Visa', 'Other Country Visa', 'Consultation Only',
  ];

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('*, customers!inner(id, name, phone, email, passport_no)')
      .in('category', categories)
      .order('created_at', { ascending: false });
    if (data) services = data;
  } catch (e) {
    console.error('Failed to fetch other visa services:', e);
  }

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no, email')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return <OtherVisaList initialServices={services} customers={customers} profile={profile} />;
}
