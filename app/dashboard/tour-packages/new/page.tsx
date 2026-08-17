import { createClient } from '@/utils/supabase/server';
import TourPackageForm from './tour-package-form';
import { getCurrentUserProfile } from '@/app/actions/users';

export default async function NewTourPackagePage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const duplicateId = searchParams?.duplicate as string | undefined;
  const supabase = await createClient();
  const currentUser = await getCurrentUserProfile();

  let customers: any[] = [];
  let suppliers: any[] = [];

  try {
    const { data: customerData } = await supabase
      .from('customers')
      .select('id, name, phone, passport_no, email')
      .order('name', { ascending: true });
    if (customerData) customers = customerData;

    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('id, name, services')
      .order('name', { ascending: true });
    if (supplierData) suppliers = supplierData;
  } catch (e) {
    console.error('Failed to fetch data:', e);
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
    <TourPackageForm 
      customers={customers} 
      suppliers={suppliers} 
      duplicateData={duplicateData} 
      currentUser={currentUser} 
    />
  );
}
