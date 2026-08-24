'use client';

import React from 'react';
import { DollarSign, CreditCard, Plane, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

interface DashboardKPICardsProps {
  totalRevenue: number;
  totalReceiving: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  collectionRate: number;
  totalBookingsCount: number;
  abv: number;
  activeBookingsCount?: number;
  closedBookingsCount?: number;
}

export function DashboardKPICards({
  totalRevenue,
  totalReceiving,
  totalCost,
  grossProfit,
  marginPercent,
  collectionRate,
  totalBookingsCount,
  abv,
  activeBookingsCount = 0,
  closedBookingsCount = 0,
}: DashboardKPICardsProps) {
  return (
    <div className="space-y-4">
      {/* 4-Card Hero Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Gross Revenue */}
        <div className="card-anthropic p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between opacity-60 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Gross Revenue</span>
              <DollarSign className="w-4 h-4 text-[#D97757]" />
            </div>
            <div className="text-2xl font-serif font-semibold text-[#222222] dark:text-[#F5F4EF]">
              {totalRevenue.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)] text-xs opacity-70 font-mono">
            <span>{totalBookingsCount} bookings</span>
            <span>ABV: {abv.toLocaleString()} AED</span>
          </div>
        </div>

        {/* KPI 2: Receiving Cashflow */}
        <div className="card-anthropic p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between opacity-60 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Collected Receiving</span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-serif font-semibold text-blue-600 dark:text-blue-400">
              {totalReceiving.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)] text-xs opacity-70 font-mono">
            <span>Collection Rate</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{collectionRate}%</span>
          </div>
        </div>

        {/* KPI 3: Direct Supplier Cost */}
        <div className="card-anthropic p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between opacity-60 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Supplier / Airline Cost</span>
              <Plane className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-serif font-semibold text-amber-600 dark:text-amber-400">
              {totalCost.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)] text-xs opacity-70 font-mono">
            <span>Payable Direct Costs</span>
            <span className="opacity-80">Suppliers</span>
          </div>
        </div>

        {/* KPI 4: Net Gross Profit */}
        <div className="card-anthropic p-5 flex flex-col justify-between border border-emerald-500/20 bg-emerald-500/5 transition-all hover:-translate-y-0.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
                Gross Profit
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {marginPercent}% Margin
              </span>
            </div>
            <div
              className={`text-2xl font-serif font-semibold ${
                grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
              }`}
            >
              {grossProfit.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-500/20 text-xs opacity-75 font-mono text-emerald-900 dark:text-emerald-200">
            <span>Formula</span>
            <span>Receiving - Cost</span>
          </div>
        </div>
      </div>

      {/* Pipeline Quick Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-[var(--anthropic-surface)] border border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium">In Pipeline (Active)</span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
            {activeBookingsCount}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[var(--anthropic-surface)] border border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium">Closed / Completed</span>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {closedBookingsCount}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-[var(--anthropic-surface)] border border-[var(--card-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#D97757]" />
            <span className="text-xs font-medium">Avg Profit / Booking</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#D97757]">
            {totalBookingsCount > 0 ? Math.round(grossProfit / totalBookingsCount).toLocaleString() : 0} AED
          </span>
        </div>
      </div>
    </div>
  );
}
