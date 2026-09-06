'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, CreditCard, ArrowUpRight, TrendingUp, AlertCircle, CheckCircle2, Shield, Plane, Map, Globe, Wrench } from 'lucide-react';
import { parseFinancialNumber } from '@/lib/financialUtils';
import { mapCategoryToModule } from '@/lib/auth-permissions';

interface CustomerFinancialLedgerProps {
  services: any[];
  invoices: any[];
}

export function CustomerFinancialLedger({ services = [], invoices = [] }: CustomerFinancialLedgerProps) {
  let totalRevenue = 0;
  let totalReceiving = 0;
  let totalCost = 0;
  let totalRefund = 0;
  let totalBalance = 0;

  services.forEach((srv) => {
    if (srv.status === 'Cancelled') return;
    const fin = srv.financials || {};
    const amt = parseFinancialNumber(fin.amount, 0);
    const disc = parseFinancialNumber(fin.discount, 0);
    const rec = parseFinancialNumber(fin.receiving_amount, amt - disc);
    const cost = parseFinancialNumber(fin.supplier_cost, 0);
    const ref = parseFinancialNumber(fin.refund, 0);
    const bal = parseFinancialNumber(fin.balance, 0);

    totalRevenue += amt;
    totalReceiving += rec;
    totalCost += cost;
    totalRefund += ref;
    totalBalance += bal;
  });

  const netProfit = totalReceiving - totalCost - totalRefund;
  const marginPercent = totalReceiving > 0 ? Math.round((netProfit / totalReceiving) * 100) : 0;

  const getCategoryIcon = (category?: string) => {
    const mod = mapCategoryToModule(category);
    if (mod === 'uae_visa') return <Shield className="w-3.5 h-3.5 text-[#D97757]" />;
    if (mod === 'air_tickets') return <Plane className="w-3.5 h-3.5 text-blue-500" />;
    if (mod === 'tour_packages') return <Map className="w-3.5 h-3.5 text-emerald-500" />;
    if (mod === 'other_visa') return <Globe className="w-3.5 h-3.5 text-purple-500" />;
    return <Wrench className="w-3.5 h-3.5 text-orange-500" />;
  };

  const getServiceLink = (srv: any) => {
    const mod = mapCategoryToModule(srv.category);
    if (mod === 'uae_visa') return `/dashboard/uae-visa/${srv.id}`;
    if (mod === 'air_tickets') return `/dashboard/air-tickets/${srv.id}`;
    if (mod === 'tour_packages') return `/dashboard/tour-packages/${srv.id}`;
    if (mod === 'other_visa') return `/dashboard/other-visa/${srv.id}`;
    return `/dashboard/custom-service/${srv.id}`;
  };

  return (
    <div className="space-y-4">
      {/* 4-Card Financial Summary Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Billed */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Billed</span>
            <DollarSign className="w-3.5 h-3.5 text-[#D97757]" />
          </div>
          <div className="text-base font-serif font-semibold">
            {totalRevenue.toLocaleString()} <span className="text-[10px] opacity-60 font-mono font-normal">AED</span>
          </div>
          <div className="text-[10px] opacity-50 font-mono mt-1 pt-1 border-t border-[var(--card-border)]">
            {services.length} Total Bookings
          </div>
        </div>

        {/* Collected / Receiving */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Collected</span>
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-base font-serif font-semibold text-blue-600 dark:text-blue-400">
            {totalReceiving.toLocaleString()} <span className="text-[10px] opacity-60 font-mono font-normal">AED</span>
          </div>
          <div className="text-[10px] opacity-50 font-mono mt-1 pt-1 border-t border-[var(--card-border)]">
            Net of discounts
          </div>
        </div>

        {/* Direct Cost */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Direct Cost</span>
            <Plane className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base font-serif font-semibold text-amber-600 dark:text-amber-400">
            {totalCost.toLocaleString()} <span className="text-[10px] opacity-60 font-mono font-normal">AED</span>
          </div>
          <div className="text-[10px] opacity-50 font-mono mt-1 pt-1 border-t border-[var(--card-border)]">
            Airline & Visa Costs
          </div>
        </div>

        {/* Net Profit */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
              Net Profit
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded">
              {marginPercent}%
            </span>
          </div>
          <div className={`text-base font-serif font-semibold ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
            {netProfit.toLocaleString()} <span className="text-[10px] opacity-60 font-mono font-normal">AED</span>
          </div>
          <div className="text-[10px] opacity-70 font-mono mt-1 pt-1 border-t border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
            Receiving - Cost
          </div>
        </div>
      </div>

      {/* Outstanding Balance Alert Card if > 0 */}
      {totalBalance > 0 ? (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Outstanding Unsettled Balance:</strong> Client has pending balance across records.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              {totalBalance.toLocaleString()} AED
            </span>
            <Link
              href={`/dashboard/invoices/new`}
              className="px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 text-[11px] font-medium transition-colors"
            >
              Generate Invoice
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>All accounts settled. Zero outstanding balance.</span>
          </div>
          <span className="font-mono text-xs font-semibold text-emerald-600">0.00 AED Due</span>
        </div>
      )}

      {/* Financial Line Item Breakdown Table */}
      <div className="card-anthropic overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--sidebar-bg)]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#D97757]" />
            <h4 className="text-xs font-serif font-medium">Service Financials Breakdown</h4>
          </div>
          <span className="text-[10px] font-mono opacity-60">{services.length} items logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-[10px] uppercase font-mono tracking-wider opacity-70">
              <tr>
                <th className="px-3 py-2 font-medium">Ref & Service</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Payment Method</th>
                <th className="px-3 py-2 text-right font-medium">Sale (AED)</th>
                <th className="px-3 py-2 text-right font-medium">Discount</th>
                <th className="px-3 py-2 text-right font-medium">Cost (AED)</th>
                <th className="px-3 py-2 text-right font-medium">Gross Profit</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs opacity-50 font-serif">
                    No services found for financial ledger.
                  </td>
                </tr>
              ) : (
                services.map((srv) => {
                  const fin = srv.financials || {};
                  const details = srv.details || {};
                  const amt = parseFinancialNumber(fin.amount, 0);
                  const disc = parseFinancialNumber(fin.discount, 0);
                  const rec = parseFinancialNumber(fin.receiving_amount, amt - disc);
                  const cost = parseFinancialNumber(fin.supplier_cost, 0);
                  const ref = parseFinancialNumber(fin.refund, 0);
                  const profit = rec - cost - ref;
                  const isProfitPositive = profit >= 0;
                  const link = getServiceLink(srv);

                  return (
                    <tr key={srv.id} className="hover:bg-[var(--sidebar-bg)] transition-colors group">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(srv.category)}
                          <Link href={link} className="font-mono text-xs font-semibold text-[#D97757] hover:underline">
                            {srv.reference_id || 'REF-N/A'}
                          </Link>
                          <span className="text-[11px] opacity-70 truncate max-w-[120px]">{srv.category}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold uppercase ${
                          srv.status === 'Closed' ? 'bg-emerald-500/10 text-emerald-600' :
                          srv.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' :
                          srv.status === 'Cancelled' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {srv.status || 'Open'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap opacity-70 font-mono text-[11px]">
                        {fin.payment_method || details.payment_method || 'Bank Transfer'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium">
                        {amt.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-red-500 text-[11px]">
                        {disc > 0 ? `-${disc.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono opacity-70">
                        {cost.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-mono font-semibold">
                        <span className={isProfitPositive ? 'text-emerald-600' : 'text-red-600'}>
                          {isProfitPositive ? `+${profit.toLocaleString()}` : profit.toLocaleString()} AED
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Link href={link} className="text-xs text-[#D97757] hover:underline font-mono inline-flex items-center gap-0.5">
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
    </div>
  );
}
