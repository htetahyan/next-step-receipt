import { createClient } from '@/utils/supabase/server';
import UAEVisaList from './uae-visa-list';

export default async function UAEVisaPage() {
  const supabase = await createClient();

  // Exclude non-UAE categories (air tickets and other country visas)
  // This ensures all migrated UAE visa variants (e.g. "60 days visit visa", "Bus", "Inside", "A2A", etc.) are included
  const nonUAECategories = [
    'Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package', 'Flight Booking',
    'Schengen / EU Visa', 'Japan Visa', 'China Visa', 'Korea Visa',
    'Armenia Visa', 'UK Visa', 'Other Country Visa', 'Consultation Only',
    'Tour Package'
  ];

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('*, customers!inner(id, name, phone, email, passport_no)')
      .not('category', 'in', `("${nonUAECategories.join('","')}")`)
      .order('created_at', { ascending: false });

    if (data) services = data;
  } catch (e) {
    console.error('Failed to fetch UAE visa services:', e);
  }

  // Fetch recent customers for the "new" form dropdown
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

  return <UAEVisaList initialServices={services} customers={customers} />;
}

