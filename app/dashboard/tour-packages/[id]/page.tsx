import TourPackageForm from '../new/tour-package-form';
import { getServiceEditPageData } from '@/lib/service-data';

export default async function EditTourPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { service, currentUser, customers, suppliers, rateCards } = await getServiceEditPageData(id);

  return (
    <>
      <TourPackageForm 
        customers={customers} 
        suppliers={suppliers} 
        rateCards={rateCards}
        initialData={service} 
        currentUser={currentUser} 
      />
    </>
  );
}
