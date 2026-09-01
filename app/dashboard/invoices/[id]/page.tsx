import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { InvoiceData } from '@/components/InvoiceTemplate';
import { getSettings } from '@/app/actions/settings';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import InvoiceActions from '@/components/InvoiceActions';

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const settings = await getSettings();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, date, subtotal, vat_amount, total_amount, payment_method, customer:customers(id, name, email, phone), items:invoice_items(id, description, quantity, rate, amount)')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoice_number,
    date: invoice.date,
    customerName: invoice.customer?.name || '',
    customerEmail: invoice.customer?.email || '',
    customerPhone: invoice.customer?.phone || '',
    paymentMethod: invoice.payment_method,
    items: (invoice.items || []).map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Number(item.amount)
    })),
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vat_amount),
    totalAmount: Number(invoice.total_amount),
    companyName: settings?.company_name,
    companyAddress: settings?.company_address,
    bankName: settings?.bank_name,
    bankBranch: settings?.bank_branch,
    bankIban: settings?.bank_iban,
    bankAccountNo: settings?.bank_account_no,
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link 
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors uppercase tracking-wider"
        >
          <ChevronLeft className="h-4 w-4" />
          Directory / Invoices
        </Link>
      </div>

      <InvoiceActions data={invoiceData} />
    </div>
  );
}
