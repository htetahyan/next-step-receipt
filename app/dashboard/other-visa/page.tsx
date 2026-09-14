import OtherVisaList from './other-visa-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { fetchModuleServiceList } from '@/lib/service-list-query';

const CATEGORIES = [
  'Schengen / EU Visa', 'Japan Visa', 'China Visa', 'Korea Visa',
  'Armenia Visa', 'UK Visa', 'Other Country Visa', 'Consultation Only',
];

export default async function OtherVisaPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'other_visa', 'read')) {
    redirect('/dashboard');
  }

  let services: any[] = [];
  try {
    services = await fetchModuleServiceList({ inCategories: CATEGORIES });
  } catch (e) {
    console.error('Failed to fetch other visa services:', e);
  }

  return <OtherVisaList initialServices={services} customers={[]} profile={profile} />;
}
