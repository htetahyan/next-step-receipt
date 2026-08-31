import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CustomerHubClient from './client-page';

async function getCustomerData(id: string) {
  const supabase = await createClient();

  const [customerRes, servicesRes, invoicesRes, docsRes] = await Promise.all([
    supabase.from('customers').select('id, name, passport_no, phone, email, metadata, created_at').eq('id', id).single(),
    supabase.from('customer_services').select('id, reference_id, customer_id, category, status, details, financials, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number, customer_id, date, total_amount, payment_method, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('customer_documents').select('id, customer_id, service_id, title, file_url, file_key, tag, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
  ]);

  if (!customerRes.data) {
    notFound();
  }

  return {
    customer: customerRes.data,
    services: servicesRes.data || [],
    pastInvoices: invoicesRes.data || [],
    documents: docsRes.data || [],
  };
}

export default async function CustomerHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer, services, pastInvoices, documents } = await getCustomerData(id);

  return (
    <CustomerHubClient customer={customer} services={services} pastInvoices={pastInvoices} documents={documents} />
  );
}