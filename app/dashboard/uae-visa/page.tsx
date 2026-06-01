import { createClient } from '@/utils/supabase/server';
import UAEVisaList from './uae-visa-list';

export default async function UAEVisaPage() {
  const supabase = await createClient();

  // Fetch all UAE visa services with their customer data
  const uaeCategories = [
    'UAE Visit Visa 30 Days',
    'UAE Visit Visa 60 Days',
    'UAE Transit Visa',
    'UAE Multi Entry Visa',
    'Visa Change by Bus',
    'Visa Change by Air',
    'Inside Visa Extension',
    'Oman Visit Visa',
    '30 Days Visa Extension',
    // Legacy categories
    'UAE Visit Visa',
    'Visa Extension B2B',
    'Visa Extension A2A',
    'Inside Visa',
  ];

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('*, customers!inner(id, name, phone, email, passport_no)')
      .in('category', uaeCategories)
      .order('created_at', { ascending: false });

    if (data) services = data;
  } catch (e) {
    console.error('Failed to fetch UAE visa services:', e);
  }

  // Fetch all customers for the "new" form dropdown
  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no')
      .order('name', { ascending: true });
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return <UAEVisaList initialServices={services} customers={customers} />;
}
