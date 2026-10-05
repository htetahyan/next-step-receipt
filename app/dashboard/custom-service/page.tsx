import CustomServiceList from './custom-service-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { fetchCustomServices } from '@/lib/service-list-query';

export default async function CustomServicePage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'custom_service', 'read')) {
    redirect('/dashboard');
  }

  let services: any[] = [];
  try {
    services = await fetchCustomServices();
  } catch (e) {
    console.error('Failed to fetch custom services:', e);
  }

  return <CustomServiceList initialServices={services} customers={[]} profile={profile} />;
}
