import CustomServiceList from './custom-service-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { UAE_VISA_CATEGORIES, AIR_TICKET_CATEGORIES, OTHER_VISA_CATEGORIES } from '@/lib/service-constants';
import { fetchModuleServiceList } from '@/lib/service-list-query';

export default async function CustomServicePage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'custom_service', 'read')) {
    redirect('/dashboard');
  }

  const predefinedCategories = [
    ...UAE_VISA_CATEGORIES,
    ...AIR_TICKET_CATEGORIES,
    ...OTHER_VISA_CATEGORIES,
    'Tour Package',
  ];

  let services: any[] = [];
  try {
    services = await fetchModuleServiceList({ notInCategories: predefinedCategories });
  } catch (e) {
    console.error('Failed to fetch custom services:', e);
  }

  return <CustomServiceList initialServices={services} customers={[]} profile={profile} />;
}
