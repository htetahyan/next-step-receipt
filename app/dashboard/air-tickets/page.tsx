import { createClient } from '@/utils/supabase/server';
import AirTicketList from './air-ticket-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';

export default async function AirTicketsPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'air_tickets', 'read')) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const ticketCategories = ['Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package'];

  let services: any[] = [];
  try {
    const { data } = await supabase
      .from('customer_services')
      .select('id, reference_id, customer_id, category, status, details, financials, created_at, customers!inner(id, name, passport_no, phone)')
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

  return <AirTicketList initialServices={services} customers={customers} profile={profile} />;
}
