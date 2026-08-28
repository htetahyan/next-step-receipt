import { createClient } from '@/utils/supabase/server'
import CustomerList from '@/components/CustomerList'
import { getCurrentUserProfile } from '@/app/actions/users'
import { checkPermission } from '@/lib/auth-permissions'
import { redirect } from 'next/navigation'

export default async function CustomersPage() {
  const profile = await getCurrentUserProfile()
  if (!checkPermission(profile, 'customers', 'read')) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, passport_no, phone, email, created_at')
      .order('created_at', { ascending: false })
    
    if (data) {
      customers = data;
    }
  } catch (e) {
    console.error('Failed to fetch customers:', e);
  }

  return <CustomerList initialCustomers={customers} profile={profile} />
}
