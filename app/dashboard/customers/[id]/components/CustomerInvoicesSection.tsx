'use client';

import React from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';

interface CustomerInvoicesSectionProps {
  customerId: string;
  pastInvoices: any[];
}

export function CustomerInvoicesSection({
  customerId,
  pastInvoices = [],
}: CustomerInvoicesSectionProps) {
  return (
    <div className="card-anthropic p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--card-border)]">
        <h3 className="text-lg font-serif">Invoices</h3>
        <Link
          href={`/dashboard/invoices/new?customerId=${customerId}`}
          className="text-sm font-medium text-[#D97757] hover:underline"
        >
          Manual Invoice
        </Link>
      </div>
      <div className="space-y-2">
        {pastInvoices.length === 0 ? (
          <div className="text-sm opacity-50 pb-4">No invoices generated yet.</div>
        ) : (
          pastInvoices.map((inv) => {
            const invoiceNo = inv.invoice_number || inv.invoiceNumber || 'INV';
            const invoiceDate =
              inv.date ||
              (inv.created_at
                ? new Date(inv.created_at).toISOString().split('T')[0]
                : 'N/A');
            const total = Number(inv.total_amount ?? inv.totalAmount ?? 0);
            const displayTotal = isNaN(total) ? '0' : total.toLocaleString();

            return (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--anthropic-surface)] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <Receipt className="w-4 h-4 opacity-50 group-hover:text-[#D97757] group-hover:opacity-100 transition-colors" />
                  <div>
                    <div className="text-sm font-medium group-hover:text-[#D97757] transition-colors">
                      {invoiceNo}
                    </div>
                    <div className="text-xs opacity-50">{invoiceDate}</div>
                  </div>
                </div>
                <div className="font-mono text-sm opacity-80 flex items-center gap-2">
                  <span>{displayTotal} AED</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#D97757] ml-1">
                    View →
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
