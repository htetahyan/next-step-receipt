import { createClient } from '@/utils/supabase/server';
import OtherVisaForm from './other-visa-form';
import { getCurrentUserProfile } from '@/app/actions/users';

export default async function NewOtherVisaPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const duplicateId = searchParams?.duplicate as string | undefined;
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no, email')
      .order('name', { ascending: true });
    if (data) customers = data;
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

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
    <OtherVisaForm 
      customers={customers} 
      duplicateData={duplicateData} 
      currentUser={currentUser} 
    />
  );
}
