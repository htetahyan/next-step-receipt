import CustomServiceForm from './custom-service-form';
import { getServiceNewPageData } from '@/lib/service-data';
import { checkPermission } from '@/lib/auth-permissions';
import { redirect } from 'next/navigation';

export default async function NewCustomServicePage() {
  const { currentUser, customers, suppliers, nextRefId } = await getServiceNewPageData('CS');

  if (!checkPermission(currentUser, 'custom_service', 'create')) {
    redirect('/dashboard');
  }

  return (
    <CustomServiceForm
      customers={customers}
      suppliers={suppliers}
      currentUser={currentUser}
      initialRefId={nextRefId}
    />
  );
}
