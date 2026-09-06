'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Receipt, Plus, Search, X, ArrowUpRight, Calendar, CreditCard } from 'lucide-react';
import { formatCurrencyAmount, parseFinancialNumber } from '@/lib/financialUtils';

interface CustomerInvoicesSectionProps {
  customerId: string;
  pastInvoices: any[];
}

export function CustomerInvoicesSection({
  customerId,
  pastInvoices = [],
}: CustomerInvoicesSectionProps) {
  const [search, setSearch] = useState('');

  const totalInvoicedAmount = useMemo(() => {
    return pastInvoices.reduce((sum, inv) => {
      return sum + parseFinancialNumber(inv.total_amount ?? inv.totalAmount, 0);
    }, 0);
  }, [pastInvoices]);

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return pastInvoices;
    const q = search.toLowerCase().trim();
    return pastInvoices.filter((inv) => {
      const invNo = (inv.invoice_number || inv.invoiceNumber || '').toLowerCase();
      const date = (inv.date || inv.created_at || '').toLowerCase();
      const method = (inv.payment_method || '').toLowerCase();
      return invNo.includes(q) || date.includes(q) || method.includes(q);
    });
  }, [pastInvoices, search]);

  return (
    <div className="card-anthropic overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-[var(--card-border)] space-y-3 bg-[var(--sidebar-bg)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 text-[#D97757] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-serif font-medium text-[var(--foreground)]">Customer Invoices</h3>
                <span className="text-[10px] font-mono font-bold bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-full">
                  {pastInvoices.length} Records
                </span>
              </div>
              <p className="text-[11px] opacity-60 font-mono">
                Total Invoiced: <strong className="text-[var(--foreground)]">{totalInvoicedAmount.toLocaleString()} AED</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute left-2.5 inset-y-0 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 opacity-40" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices..."
                className="input-anthropic pl-8 pr-7 h-8 text-xs w-44 sm:w-52"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 inset-y-0 flex items-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Link
              href={`/dashboard/invoices/new?customerId=${customerId}`}
              className="flex items-center gap-1.5 h-8 px-3 bg-[#D97757] hover:bg-[#c66446] text-white text-xs font-medium rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-[10px] uppercase font-mono tracking-wider opacity-70">
            <tr>
              <th className="px-3.5 py-2 font-medium">Invoice No.</th>
              <th className="px-3.5 py-2 font-medium">Date</th>
              <th className="px-3.5 py-2 font-medium">Payment Method</th>
              <th className="px-3.5 py-2 text-right font-medium">Amount (AED)</th>
              <th className="px-3.5 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs opacity-50 font-serif">
                  {search ? 'No invoices match your search criteria.' : 'No invoices generated for this client yet.'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const invoiceNo = inv.invoice_number || inv.invoiceNumber || 'INV';
                const invoiceDate =
                  inv.date ||
                  (inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : '—');
                const displayTotal = formatCurrencyAmount(inv.total_amount ?? inv.totalAmount);
                const paymentMethod = inv.payment_method || 'Bank Transfer';

                return (
                  <tr key={inv.id} className="hover:bg-[var(--sidebar-bg)] transition-colors group">
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="font-mono text-xs font-semibold text-[#D97757] hover:underline flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5 opacity-60" />
                        {invoiceNo}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap opacity-70 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-50" />
                        <span>{invoiceDate}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap opacity-70 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 opacity-50" />
                        <span>{paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-xs">
                      {displayTotal} <span className="text-[10px] font-normal opacity-60">AED</span>
                    </td>
                    <td className="px-3.5 py-2 text-right whitespace-nowrap">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-xs text-[#D97757] hover:underline font-mono inline-flex items-center gap-0.5 opacity-80 group-hover:opacity-100"
                      >
                        View <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
