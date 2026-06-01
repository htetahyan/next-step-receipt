import { createClient } from '@/utils/supabase/server';
import UAEVisaForm from './uae-visa-form';

export default async function NewUAEVisaPage() {
  const supabase = await createClient();

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no, email')
      .order('name', { ascending: true });
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return <UAEVisaForm customers={customers} />;
}
