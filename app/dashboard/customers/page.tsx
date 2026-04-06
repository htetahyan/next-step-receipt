import { createClient } from '@/utils/supabase/server'
import CustomerList from '@/components/CustomerList'

export default async function CustomersPage() {
  const supabase = await createClient()

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      customers = data;
    }
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return <CustomerList initialCustomers={customers} />
}
