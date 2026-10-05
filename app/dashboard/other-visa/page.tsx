import OtherVisaList from './other-visa-list';
import { getCurrentUserProfile } from '@/app/actions/users';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';
import { fetchOtherCountryVisas } from '@/lib/service-list-query';

export default async function OtherVisaPage() {
  const profile = await getCurrentUserProfile();
  if (!checkPermission(profile, 'other_visa', 'read')) {
    redirect('/dashboard');
  }

  let services: any[] = [];
  try {
    services = await fetchOtherCountryVisas();
  } catch (e) {
    console.error('Failed to fetch other visa services:', e);
  }

  return <OtherVisaList initialServices={services} customers={[]} profile={profile} />;
}
