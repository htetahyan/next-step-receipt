'use client';

import Link from 'next/link';
import { CheckCircle, ChevronDown, FileSpreadsheet, Loader2, Plus, Shield, SlidersHorizontal } from 'lucide-react';
import RecordScopeToggle from '@/components/ui/RecordScopeToggle';
import { DateInfo, ExpiryFilter, getExpiryInfo } from '@/lib/visaTracker';

export default function VisaListToolbar({
  visaCount,
  summary,
  density,
  autoClosing,
  showExportMenu,
  dateInfo,
  visaOnly,
  filtered,
  expiredCount,
  thisMonthCount,
  expiryFilter,
  scope,
  onToggleDensity,
  onToggleExport,
  onExport,
  onAutoClose,
  onExpiredChip,
  onThisMonthChip,
}: {
  visaCount: number;
  summary: { totalAmount: number; totalReceiving: number; totalSupplierCost: number; totalProfit: number; count: number };
  density: 'compact' | 'normal';
  autoClosing: boolean;
  showExportMenu: boolean;
  dateInfo: DateInfo;
  visaOnly: any[];
  filtered: any[];
  expiredCount: number;
  thisMonthCount: number;
  expiryFilter: ExpiryFilter;
  scope: { allTime: boolean; loading: boolean; change: (v: boolean) => void };
  onToggleDensity: () => void;
  onToggleExport: () => void;
  onExport: (items: any[], prefix: string, format?: 'xlsx' | 'csv') => void;
  onAutoClose: () => void;
  onExpiredChip: () => void;
  onThisMonthChip: () => void;
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--card-border)] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">UAE Visa Tracker</h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--sidebar-bg)] border border-[var(--card-border)]">{visaCount} visas</span>
            <RecordScopeToggle allTime={scope.allTime} loading={scope.loading} onChange={scope.change} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onToggleDensity} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-semibold cursor-pointer">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#D97757]" />
            {density === 'compact' ? 'Compact' : 'Normal'}
          </button>
          <div className="relative">
            <button onClick={onToggleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> Export <ChevronDown className="h-3 w-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-1.5 shadow-xl z-50 text-xs">
                <button onClick={() => onExport(filtered, 'UAE_Visa_Filtered')} className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)]">Export Filtered</button>
                <button onClick={() => onExport(visaOnly.filter((s) => getExpiryInfo(s, dateInfo).isExpiringThisMonth), `UAE_Visa_Expiring_${dateInfo.currentMonthName}`)} className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] text-amber-600">Expiring This Month</button>
                <button onClick={() => onExport(visaOnly, 'UAE_Visa_All_Records')} className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)]">Export All Visas</button>
                <button onClick={() => onExport(filtered, 'UAE_Visa_Filtered', 'csv')} className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)]">Export CSV</button>
              </div>
            )}
          </div>
          <button onClick={onAutoClose} disabled={autoClosing} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer">
            {autoClosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
            Auto-Close
          </button>
          <Link href="/dashboard/uae-visa/new" className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97757] px-3.5 py-1.5 text-xs font-semibold text-white">
            <Plus className="h-3.5 w-3.5" /> New Visa
          </Link>
        </div>
      </div>

      <div className="card-anthropic px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span>Total: <strong className="font-mono">{summary.totalAmount.toLocaleString()}</strong></span>
          <span>Receiving: <strong className="font-mono text-blue-600">{summary.totalReceiving.toLocaleString()}</strong></span>
          <span>Cost: <strong className="font-mono text-amber-600">{summary.totalSupplierCost.toLocaleString()}</strong></span>
          <span>Profit: <strong className={`font-mono ${summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{summary.totalProfit.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <button onClick={onExpiredChip} className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${expiryFilter === 'expired' ? 'bg-red-600 text-white' : 'bg-red-500/10 text-red-600'}`}>
              {expiredCount} Expired
            </button>
          )}
          {thisMonthCount > 0 && (
            <button onClick={onThisMonthChip} className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${expiryFilter === 'this_month' ? 'bg-amber-600 text-white' : 'bg-amber-500/10 text-amber-700'}`}>
              {thisMonthCount} This Month
            </button>
          )}
        </div>
      </div>
    </>
  );
}
