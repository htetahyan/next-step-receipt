'use client';

import { User, Phone, Mail, FileText, ArrowLeft, Receipt, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import NewServiceDialog from '@/components/NewServiceDialog';
import DocumentModal from '@/components/DocumentModal';

export default function CustomerHubClient({ customer, services, pastInvoices, documents }: {
  customer: any;
  services: any[];
  pastInvoices: any[];
  documents: any[];
}) {
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/customers" className="p-2 bg-[var(--sidebar-bg)] rounded-full hover:bg-[var(--card-border)] transition-colors">
          <ArrowLeft className="w-4 h-4 opacity-70" />
        </Link>
        <h1 className="text-3xl font-serif font-normal tracking-tight">
          Customer Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT COLUMN - Identity */}
        <div className="md:col-span-1 space-y-6">
          <div className="card-anthropic p-8">
            <div className="w-16 h-16 rounded-full bg-[var(--anthropic-surface)] flex items-center justify-center mb-6">
              <User className="w-6 h-6 opacity-60" />
            </div>
            <h2 className="text-xl font-serif mb-6 leading-tight">{customer.name}</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 opacity-50" />
                <span className="opacity-80">{customer.phone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 opacity-50" />
                <span className="opacity-80">{customer.email || 'No email'}</span>
              </div>
              {customer.passportNo && (
                <div className="flex items-center gap-3 text-sm pt-4 border-t border-[var(--card-border)]">
                  <FileText className="w-4 h-4 opacity-50" />
                  <span className="opacity-80 font-mono text-xs tracking-wider">{customer.passportNo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Services & Documents */}
        <div className="md:col-span-2 space-y-8">
          {/* Services Tab */}
          <div className="card-anthropic p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
              <h3 className="text-lg font-serif">Active Services</h3>
              <button
                onClick={() => setIsServiceDialogOpen(true)}
                className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>

            <div className="space-y-6">
              {services.length === 0 ? (
                <div className="text-sm opacity-50 pb-4">No active services found.</div>
              ) : (
                services.map(service => {
                  const details = (service.details as any) || {};
                  const fin = (service.financials as any) || {};
                  const amount = Number(fin.amount) || 0;
                  const discount = Number(fin.discount) || 0;
                  const receiving = Number(fin.receiving_amount) || (amount - discount);
                  const supplierCost = Number(fin.supplier_cost) || 0;
                  const refund = Number(fin.refund) || 0;
                  const profit = receiving - supplierCost - refund;
                  const balance = Number(fin.balance) || 0;

                  return (
                    <div key={service.id} className="p-6 rounded-xl bg-[var(--anthropic-surface)] border border-[var(--card-border)] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-serif text-lg flex items-center gap-2">
                            {service.category}
                            {service.reference_id && (
                              <span className="text-xs font-mono text-[#D97757] bg-[#D97757]/10 px-2 py-0.5 rounded font-semibold">
                                {service.reference_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-[var(--background)] opacity-80 border border-[var(--card-border)] font-bold">
                          {service.status}
                        </div>
                      </div>

                      {/* Service Details Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs opacity-80 border-t border-[var(--card-border)] pt-3">
                        {details.visa_issued_date && <div><span className="opacity-50">Issued:</span> <span className="font-medium">{details.visa_issued_date}</span></div>}
                        {details.travel_date && <div><span className="opacity-50">Travel:</span> <span className="font-medium">{details.travel_date}</span></div>}
                        {details.visa_expiry_date && <div><span className="opacity-50">Expiry:</span> <span className="font-medium font-mono text-[#D97757]">{details.visa_expiry_date}</span></div>}
                        {details.visa_duration && <div><span className="opacity-50">Duration:</span> <span className="font-medium">{details.visa_duration}</span></div>}
                        {details.visa_supplier && <div><span className="opacity-50">Supplier:</span> <span className="font-medium">{details.visa_supplier}</span></div>}
                        {details.referred_by && <div><span className="opacity-50">Referred By:</span> <span className="font-medium">{details.referred_by}</span></div>}
                        {details.comments && <div className="col-span-2"><span className="opacity-50">Comments:</span> <span className="font-medium">{details.comments}</span></div>}
                        {details.remark && <div className="col-span-2"><span className="opacity-50">Remark:</span> <span className="font-medium text-amber-600">{details.remark}</span></div>}
                      </div>

                      {/* Financials Summary */}
                      <div className="mt-4 pt-4 border-t border-[var(--card-border)] bg-[var(--background)] p-3 rounded-lg text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between"><span className="opacity-60">Amount / Rate:</span><span>{amount.toLocaleString()} AED</span></div>
                        {discount > 0 && <div className="flex justify-between text-red-500"><span className="opacity-60">Discount / Agent Fee:</span><span>-{discount.toLocaleString()} AED</span></div>}
                        <div className="flex justify-between font-bold text-blue-600"><span className="opacity-70">Receiving Amount:</span><span>{receiving.toLocaleString()} AED</span></div>
                        <div className="flex justify-between text-amber-600"><span className="opacity-70">Supplier Cost:</span><span>{supplierCost.toLocaleString()} AED</span></div>
                        {refund > 0 && <div className="flex justify-between text-red-500"><span className="opacity-70">Refund:</span><span>-{refund.toLocaleString()} AED</span></div>}
                        <div className="flex justify-between font-bold border-t border-black/10 dark:border-white/10 pt-1.5 text-green-600">
                          <span>Gross Profit (GP):</span>
                          <span>{profit.toLocaleString()} AED</span>
                        </div>
                        {(fin.payment_method || details.payment_method) && (
                          <div className="flex justify-between text-[11px] opacity-60 pt-1">
                            <span>Payment Method:</span>
                            <span>{fin.payment_method || details.payment_method}</span>
                          </div>
                        )}
                        {balance !== 0 && (
                          <div className="flex justify-between text-[11px] opacity-60">
                            <span>Balance:</span>
                            <span>{balance.toLocaleString()} AED</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Invoices Tab */}
          <div className="card-anthropic p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
              <h3 className="text-lg font-serif">Invoices</h3>
              <Link href={`/dashboard/invoices/new?customerId=${customer.id}`} className="text-sm font-medium text-[#D97757] hover:underline">
                Manual Invoice
              </Link>
            </div>
            <div className="space-y-2">
              {pastInvoices.length === 0 ? (
                <div className="text-sm opacity-50 pb-4">No invoices generated yet.</div>
              ) : (
                pastInvoices.map(inv => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--anthropic-surface)] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <Receipt className="w-4 h-4 opacity-50 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                      <div>
                        <div className="text-sm font-medium group-hover:text-[#D97757] transition-colors">{inv.invoiceNumber}</div>
                        <div className="text-xs opacity-50">{inv.date}</div>
                      </div>
                    </div>
                    <div className="font-mono text-sm opacity-80 flex items-center gap-2">
                      <span>{Number(inv.totalAmount).toLocaleString()} AED</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#D97757] ml-1">View →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Documents Section */}
          <div className="card-anthropic p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
              <h3 className="text-lg font-serif">Documents</h3>
              <button
                onClick={() => setIsDocsModalOpen(true)}
                className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Manage Documents
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {documents.length === 0 ? (
                <div className="col-span-2 text-sm opacity-50 pb-4">No documents found.</div>
              ) : (
                documents.slice(0, 4).map(doc => (
                  <a 
                    key={doc.id} 
                    href={doc.fileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--anthropic-surface)] border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors group"
                  >
                    <FileText className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{doc.title}</div>
                      <div className="text-[10px] opacity-40 uppercase tracking-tighter">{doc.tag}</div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <NewServiceDialog
        isOpen={isServiceDialogOpen}
        onClose={() => setIsServiceDialogOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
        customerMetadata={customer.metadata}
      />

      <DocumentModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
      />
    </div>
  );
}