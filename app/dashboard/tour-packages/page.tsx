import { createClient } from '@/utils/supabase/server';
import TourPackageList from './tour-package-list';

export default async function TourPackagesPage() {
  const supabase = await createClient();

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('*, customers!inner(id, name, phone, email, passport_no)')
      .eq('category', 'Tour Package')
      .order('created_at', { ascending: false });
    if (data) services = data;
  } catch (e) {
    console.error('Failed to fetch tour package services:', e);
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

  return <TourPackageList initialServices={services} customers={customers} />;
}
