import AirTicketList from './air-ticket-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { fetchModuleServiceList } from '@/lib/service-list-query';

const TICKET_CATEGORIES = ['Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package'];

export default async function AirTicketsPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'air_tickets', 'read')) {
    redirect('/dashboard');
  }

  let services: any[] = [];
  try {
    services = await fetchModuleServiceList({ inCategories: TICKET_CATEGORIES });
  } catch (e) {
    console.error('Failed to fetch air ticket services:', e);
  }

  return <AirTicketList initialServices={services} customers={[]} profile={profile} />;
}
