import { db } from '@/db';
import { customers, customerServices, invoices, customerDocuments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import CustomerHubClient from './client-page';

async function getCustomerData(id: string) {
  const [result, services, pastInvoices, docs] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, id)),
    db.select().from(customerServices).where(eq(customerServices.customerId, id)).orderBy(desc(customerServices.createdAt)),
    db.select().from(invoices).where(eq(invoices.customerId, id)).orderBy(desc(invoices.createdAt)),
    db.select().from(customerDocuments).where(eq(customerDocuments.customerId, id)).orderBy(desc(customerDocuments.createdAt))
  ]);

  if (result.length === 0) {
    notFound();
  }

  return {
    customer: result[0],
    services,
    pastInvoices,
    documents: docs
  };
}

export default async function CustomerHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer, services, pastInvoices, documents } = await getCustomerData(id);

  return (
    <CustomerHubClient customer={customer} services={services} pastInvoices={pastInvoices} documents={documents} />
  );
}