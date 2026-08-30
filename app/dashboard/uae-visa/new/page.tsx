import UAEVisaForm from './uae-visa-form';
import { getCachedSuppliersAndRates } from '@/lib/cachedRates';
import { getServiceNewPageData, getServiceById } from '@/lib/service-data';

export default async function NewUAEVisaPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const duplicateId = searchParams?.duplicate as string | undefined;

  const { currentUser, customers, suppliers, rateCards } = await getServiceNewPageData();
  const { uaeVisaTypes } = await getCachedSuppliersAndRates();

  let duplicateData = null;
  if (duplicateId) {
    try {
      duplicateData = await getServiceById(duplicateId);
    } catch (e) {
      console.error('Failed to fetch duplicate service:', e);
    }
  }

  return (
    <UAEVisaForm 
      customers={customers} 
      suppliers={suppliers} 
      rateCards={rateCards}
      uaeVisaTypes={uaeVisaTypes}
      duplicateData={duplicateData}
      currentUser={currentUser}
    />
  );
}
