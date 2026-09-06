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
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="card-anthropic p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--foreground)]">
              Welcome back, {customer?.name || "Valued Client"}!
            </h2>
            <p className="text-xs sm:text-sm opacity-60 mt-1">
              View and download your official invoices, payment receipts, and booking records.
            </p>
          </div>
          {customer?.passport_no && (
            <div className="flex items-center gap-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] px-3 py-1.5 rounded-xl text-xs font-mono shrink-0 self-start sm:self-auto">
              <span className="opacity-50 text-[10px] uppercase font-sans">Passport:</span>
              <span className="font-bold text-[#D97757]">{customer.passport_no}</span>
            </div>
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs overflow-hidden">
        <div className="border-b border-[var(--card-border)] px-6 py-4 bg-[var(--sidebar-bg)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D97757]" />
            <h3 className="text-sm font-serif font-semibold text-[var(--foreground)]">
              Your Invoices & Receipts ({invoices.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] uppercase tracking-wider text-[10px] opacity-70 font-mono">
              <tr>
                <th scope="col" className="px-6 py-3.5">Invoice #</th>
                <th scope="col" className="px-6 py-3.5">Amount</th>
                <th scope="col" className="px-6 py-3.5">Method</th>
                <th scope="col" className="px-6 py-3.5">Date</th>
                <th scope="col" className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-[var(--sidebar-bg)] transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-[#D97757] opacity-70" />
                      <span className="font-mono font-bold text-[var(--foreground)]">{invoice.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-bold font-mono text-[var(--foreground)]">
                    AED {(Number(invoice.total_amount) || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      {invoice.payment_method || 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 opacity-70 font-mono text-[11px]">{invoice.date || '—'}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97757] hover:opacity-80 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5" /> View / PDF
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center opacity-50 italic">
                    No invoices found on your account.
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
