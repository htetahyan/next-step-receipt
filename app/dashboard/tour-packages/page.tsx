import TourPackageList from './tour-package-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { fetchModuleServiceList } from '@/lib/service-list-query';

export default async function TourPackagesPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'tour_packages', 'read')) {
    redirect('/dashboard');
  }

  let services: any[] = [];
  try {
    services = await fetchModuleServiceList({ inCategories: ['Tour Package'] });
  } catch (e) {
    console.error('Failed to fetch tour package services:', e);
  }

  return <TourPackageList initialServices={services} customers={[]} profile={profile} />;
}
