import OtherVisaForm from './other-visa-form';
import { getServiceNewPageData, getServiceById } from '@/lib/service-data';

export default async function NewOtherVisaPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const duplicateId = searchParams?.duplicate as string | undefined;

  const { currentUser, customers, suppliers, rateCards } = await getServiceNewPageData();

  let duplicateData = null;
  if (duplicateId) {
    try {
      duplicateData = await getServiceById(duplicateId);
    } catch (e) {
      console.error('Failed to fetch duplicate service:', e);
    }
  }

  return (
    <OtherVisaForm 
      customers={customers} 
      suppliers={suppliers}
      rateCards={rateCards}
      duplicateData={duplicateData} 
      currentUser={currentUser} 
    />
  );
}
