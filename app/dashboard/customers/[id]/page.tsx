import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CustomerHubClient from './client-page';

async function getCustomerData(id: string) {
  const supabase = await createClient();

  const [customerRes, servicesRes, invoicesRes, docsRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_services').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('customer_documents').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
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