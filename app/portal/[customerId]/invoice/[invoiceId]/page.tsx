import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import InvoiceActions from '@/components/InvoiceActions';
import { InvoiceData } from '@/components/InvoiceTemplate';
import { verifyPortalToken } from '@/lib/portal-token';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { createClient } from '@/utils/supabase/server';

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; invoiceId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { customerId, invoiceId } = await params;
  const { t: token } = await searchParams;
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const hasPublicLink = verifyPortalToken(customerId, token);
  if (!user && !hasPublicLink) notFound();

  const reader = hasPublicLink ? createServiceRoleClient() || session : session;
  const { data: invoice } = await reader
    .from('invoices')
    .select('id, invoice_number, customer_id, date, subtotal, vat_amount, total_amount, payment_method, customer:customers(id, name, email, phone), items:invoice_items(id, description, quantity, rate, amount)')
    .eq('id', invoiceId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: settings } = await reader
    .from('settings')
    .select('company_name, company_address, bank_name, bank_branch, bank_iban, bank_account_no')
    .limit(1)
    .maybeSingle();

  const customer = invoice.customer as any;
  const invoiceData: InvoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    date: invoice.date,
    customerName: customer?.name || '',
    customerEmail: customer?.email || '',
    customerPhone: customer?.phone || '',
    paymentMethod: invoice.payment_method,
    items: (invoice.items || []).map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Number(item.amount),
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

  const back = `/portal/${customerId}${token ? `?t=${encodeURIComponent(token)}` : ''}`;

  return (
    <div className="space-y-6 pb-20">
      <Link href={back} className="inline-flex items-center gap-2 text-sm font-medium text-[#D97757] print:hidden">
        <ChevronLeft className="h-4 w-4" />
        Back to your invoices
      </Link>
      <InvoiceActions data={invoiceData} />
    </div>
  );
}
