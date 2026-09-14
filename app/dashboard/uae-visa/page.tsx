import UAEVisaList from './uae-visa-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { fetchModuleServiceList } from '@/lib/service-list-query';

const NON_UAE_CATEGORIES = [
  'Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package', 'Flight Booking',
  'Schengen / EU Visa', 'Japan Visa', 'China Visa', 'Korea Visa',
  'Armenia Visa', 'UK Visa', 'Other Country Visa', 'Consultation Only',
  'Tour Package',
];

export default async function UAEVisaPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'uae_visa', 'read')) {
    redirect('/dashboard');
  }

  let services: any[] = [];
  try {
    services = await fetchModuleServiceList({ notInCategories: NON_UAE_CATEGORIES });
  } catch (e) {
    console.error('Failed to fetch UAE visa services:', e);
  }

  return <UAEVisaList initialServices={services} customers={[]} profile={profile} />;
}
