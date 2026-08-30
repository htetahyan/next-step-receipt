import UAEVisaForm from '../new/uae-visa-form';
import { getServiceEditPageData } from '@/lib/service-data';

export default async function EditUAEVisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { service, currentUser, customers, suppliers, rateCards } = await getServiceEditPageData(id);

  return (
    <>
      <UAEVisaForm customers={customers} suppliers={suppliers} initialData={service} currentUser={currentUser} rateCards={rateCards} />
    </>
  );
}
