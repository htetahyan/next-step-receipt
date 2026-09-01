import { createClient } from '@/utils/supabase/server'
import { FileText, Download } from 'lucide-react'
import Link from 'next/link'

export default async function PortalPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const supabase = await createClient()

  let customer: any = null;
  let invoices: any[] = [];

  try {
    const { data: custData } = await supabase
      .from('customers')
      .select('id, name, email, phone, passport_no, created_at')
      .eq('id', customerId)
      .maybeSingle()
    if (custData) customer = custData;

    const { data: invData } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, date, total_amount, payment_method, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    if (invData && invData.length > 0) invoices = invData;
  } catch (e) {
    console.error('Failed to fetch portal data:', e);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Welcome back, {customer?.name || "Customer"}!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Below you can view and download all your past invoices. If you have any questions, please contact us.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">Your Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">Invoice</th>
                <th scope="col" className="px-6 py-4">Amount</th>
                <th scope="col" className="px-6 py-4">Payment Method</th>
                <th scope="col" className="px-6 py-4">Date</th>
                <th scope="col" className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-white">{invoice.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">AED {(Number(invoice.total_amount) || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">
                      {invoice.payment_method || 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{invoice.date || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-emerald-700 hover:text-emerald-600 inline-flex items-center gap-1 text-sm font-medium"
                    >
                      <Download className="w-4 h-4" /> View / PDF
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
