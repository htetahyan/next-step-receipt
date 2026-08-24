'use client';

import React from 'react';
import { Award, UserCheck, TrendingUp, ChevronRight } from 'lucide-react';
import { parseFinancialNumber } from '@/lib/financialUtils';

interface StaffStats {
  name: string;
  bookings: number;
  revenue: number;
  profit: number;
}

interface StaffLeaderboardProps {
  services: any[];
}

export function StaffLeaderboard({ services }: StaffLeaderboardProps) {
  const staffMap = new Map<string, StaffStats>();

  services.forEach((srv) => {
    const details = srv.details || {};
    const fin = srv.financials || {};
    const staffName = details.handled_by?.trim() || details.served_by?.trim() || 'Unassigned';

    const amt = parseFinancialNumber(fin.amount, 0);
    const disc = parseFinancialNumber(fin.discount, 0);
    const rec = parseFinancialNumber(fin.receiving_amount, amt - disc);
    const cost = parseFinancialNumber(fin.supplier_cost, 0);
    const ref = parseFinancialNumber(fin.refund, 0);
    const profit = rec - cost - ref;

    if (!staffMap.has(staffName)) {
      staffMap.set(staffName, { name: staffName, bookings: 0, revenue: 0, profit: 0 });
    }

    const current = staffMap.get(staffName)!;
    current.bookings += 1;
    current.revenue += rec;
    current.profit += profit;
  });

  const rankedStaff = Array.from(staffMap.values())
    .filter((s) => s.name !== 'Unassigned' || s.bookings > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  if (rankedStaff.length === 0) return null;

  return (
    <div className="card-anthropic p-6 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)] mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-serif font-normal">Staff Performance</h3>
          </div>
          <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider">By Profit</span>
        </div>

        <div className="space-y-3.5">
          {rankedStaff.map((staff, idx) => (
            <div
              key={staff.name}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--card-border)]/60 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                    idx === 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : idx === 1
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      : 'bg-[var(--card-border)] opacity-70'
                  }`}
                >
                  #{idx + 1}
                </span>
                <div className="truncate">
                  <div className="font-medium truncate">{staff.name}</div>
                  <div className="text-[10px] opacity-50 font-mono">
                    {staff.bookings} {staff.bookings === 1 ? 'booking' : 'bookings'}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{staff.profit.toLocaleString()} AED
                </div>
                <div className="text-[10px] opacity-50 font-mono">
                  Vol: {staff.revenue.toLocaleString()} AED
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[var(--card-border)] flex items-center justify-between text-xs opacity-50 font-mono">
        <span>Team Total</span>
        <span>
          {rankedStaff.reduce((acc, s) => acc + s.profit, 0).toLocaleString()} AED Profit
        </span>
      </div>
    </div>
  );
}
