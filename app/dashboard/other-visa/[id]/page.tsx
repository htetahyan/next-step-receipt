import OtherVisaForm from '../new/other-visa-form';
import { getServiceEditPageData } from '@/lib/service-data';

export default async function EditOtherVisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { service, currentUser, customers } = await getServiceEditPageData(id);

  return (
    <>
      <OtherVisaForm customers={customers} initialData={service} currentUser={currentUser} />
    </>
  );
}
