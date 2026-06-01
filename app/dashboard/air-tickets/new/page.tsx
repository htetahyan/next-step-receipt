import { createClient } from '@/utils/supabase/server';
import AirTicketForm from './air-ticket-form';

export default async function NewAirTicketPage() {
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

  return <AirTicketForm customers={customers} />;
}
