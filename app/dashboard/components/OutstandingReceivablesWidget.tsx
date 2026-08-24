'use client';

import React from 'react';
import Link from 'next/link';
import { CreditCard, AlertCircle, ArrowUpRight, User } from 'lucide-react';
import { parseFinancialNumber } from '@/lib/financialUtils';

interface OutstandingReceivablesWidgetProps {
  services: any[];
}

export function OutstandingReceivablesWidget({ services }: OutstandingReceivablesWidgetProps) {
  const pendingItems: Array<{
    id: string;
    refId: string;
    customerId?: string;
    customerName: string;
    category: string;
    balance: number;
    amount: number;
  }> = [];

  let totalPendingBalance = 0;

  services.forEach((srv) => {
    if (srv.status === 'Cancelled') return;
    const fin = srv.financials || {};
    const cust = srv.customer || {};
    const bal = parseFinancialNumber(fin.balance, 0);

    if (bal > 0) {
      totalPendingBalance += bal;
      pendingItems.push({
        id: srv.id,
        refId: srv.reference_id || 'N/A',
        customerId: srv.customer_id,
        customerName: cust.name || srv.details?.customer_name || 'Customer',
        category: srv.category || 'Service',
        balance: bal,
        amount: parseFinancialNumber(fin.amount, 0),
      });
    }
  });

  if (pendingItems.length === 0) return null;

  return (
    <div className="card-anthropic p-6 flex flex-col justify-between shadow-sm border-amber-500/20 bg-amber-500/5">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-serif font-normal text-amber-900 dark:text-amber-200">
              Outstanding Balances
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
            {totalPendingBalance.toLocaleString()} AED
          </span>
        </div>

        <div className="space-y-3">
          {pendingItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="font-medium truncate flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#D97757] font-semibold">{item.refId}</span>
                  <span className="truncate">{item.customerName}</span>
                </div>
                <div className="text-[10px] opacity-60 font-mono truncate">{item.category}</div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {item.balance.toLocaleString()} AED
                </span>
                {item.customerId && (
                  <div>
                    <Link
                      href={`/dashboard/customers/${item.customerId}`}
                      className="text-[10px] text-[#D97757] hover:underline inline-flex items-center gap-0.5"
                    >
                      Profile <ArrowUpRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-amber-500/20 flex items-center justify-between text-xs opacity-70 font-mono">
        <span>{pendingItems.length} Unsettled Accounts</span>
        <Link href="/dashboard/invoices" className="text-[#D97757] hover:underline">
          Invoices ledger →
        </Link>
      </div>
    </div>
  );
}
