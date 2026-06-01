import { createClient } from '@/utils/supabase/server';
import OtherVisaForm from './other-visa-form';

export default async function NewOtherVisaPage() {
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

  return <OtherVisaForm customers={customers} />;
}
