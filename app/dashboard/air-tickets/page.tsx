import { createClient } from '@/utils/supabase/server';
import AirTicketList from './air-ticket-list';

export default async function AirTicketsPage() {
  const supabase = await createClient();

  const ticketCategories = ['Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package'];

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('*, customers!inner(id, name, phone, email, passport_no)')
      .in('category', ticketCategories)
      .order('created_at', { ascending: false });
    if (data) services = data;
  } catch (e) {
    console.error('Failed to fetch air ticket services:', e);
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

  return <AirTicketList initialServices={services} customers={customers} />;
}
