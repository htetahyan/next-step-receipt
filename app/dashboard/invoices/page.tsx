import { createClient } from '@/utils/supabase/server'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import InvoiceList from '@/components/InvoiceList'

export default async function InvoicesPage() {
  const supabase = await createClient()

  let invoices: any[] = [];

  try {
    const { data } = await supabase
      .from('invoices')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false })
    
    if (data) {
      invoices = data;
    }
  } catch (e) {
    console.error('Failed to fetch invoices:', e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Invoices Registry</h1>
          <p className="text-slate-500 dark:text-slate-400">Total generated records: {invoices.length}</p>
        </div>
        <Link 
          href="/dashboard/invoices/new" 
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-700/20 transition-all hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create New Invoice
        </Link>
      </div>

      <InvoiceList initialInvoices={invoices} />
    </div>
  )
}
