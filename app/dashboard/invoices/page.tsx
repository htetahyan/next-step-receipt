import { createClient } from '@/utils/supabase/server'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import InvoiceList from '@/components/InvoiceList'
import { getCurrentUserProfile } from '@/app/actions/users'
import { checkPermission } from '@/lib/auth-permissions'
import { redirect } from 'next/navigation'

export default async function InvoicesPage() {
  const profile = await getCurrentUserProfile()
  if (!checkPermission(profile, 'invoices', 'read')) {
    redirect('/dashboard')
  }

  const canCreate = checkPermission(profile, 'invoices', 'create')
  const supabase = await createClient()

  let invoices: any[] = [];

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, date, total_amount, payment_method, created_at, customer:customers(id, name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase invoices fetch error:', error);
    } else if (data) {
      invoices = data;
    }
  } catch (e) {
    console.error('Failed to fetch invoices:', e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-3"><FileText className="h-8 w-8 text-[#D97757]" /> Invoices Registry</h1>
          <p className="text-slate-500 dark:text-slate-400">Total generated records: {invoices.length}</p>
        </div>
        {canCreate && (
          <Link 
            href="/dashboard/invoices/new" 
            className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] hover:opacity-90 text-[#F5F4EF] px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create New Invoice
          </Link>
        )}
      </div>

      <InvoiceList initialInvoices={invoices} profile={profile} />
    </div>
  )
}
