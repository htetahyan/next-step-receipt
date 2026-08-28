import { createClient } from '@/utils/supabase/server';
import UAEVisaForm from './uae-visa-form';
import { getCurrentUserProfile } from '@/app/actions/users';
import { getCachedSuppliersAndRates } from '@/lib/cachedRates';

export default async function NewUAEVisaPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const duplicateId = searchParams?.duplicate as string | undefined;
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  let customers: any[] = [];

  try {
    const { data: customerData } = await supabase
      .from('customers')
      .select('id, name, passport_no, phone')
      .order('created_at', { ascending: false })
      .limit(100);
    if (customerData) customers = customerData;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  // Fast cached suppliers and rate cards
  const { suppliers, rateCards, uaeVisaTypes } = await getCachedSuppliersAndRates();

  let duplicateData = null;
  if (duplicateId) {
    try {
      const { data } = await supabase
        .from('customer_services')
        .select('*, customers(*)')
        .eq('id', duplicateId)
        .single();
      if (data) duplicateData = data;
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
