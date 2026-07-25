import { createClient } from '@/utils/supabase/server';
import UAEVisaForm from './uae-visa-form';

export default async function NewUAEVisaPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const duplicateId = searchParams?.duplicate as string | undefined;
  const supabase = await createClient();

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

  return <UAEVisaForm customers={customers} suppliers={suppliers} />;
}
