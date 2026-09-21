'use client';

import { Filter, LayoutGrid, List, Search, X } from 'lucide-react';
import { ExpiryFilter } from '@/lib/visaTracker';

export default function VisaListFilters({
  search,
  setSearch,
  searchRef,
  viewMode,
  setViewMode,
  showFilters,
  setShowFilters,
  statusFilter,
  setStatusFilter,
  expiryFilter,
  setExpiryFilter,
  supplierFilter,
  setSupplierFilter,
  categoryFilter,
  setCategoryFilter,
  suppliers,
  categories,
  statusCounts,
  expiringSoonCount,
  expiredCount,
  dateInfo,
}: {
  search: string;
  setSearch: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  viewMode: 'list' | 'kanban';
  setViewMode: (v: 'list' | 'kanban') => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  expiryFilter: ExpiryFilter;
  setExpiryFilter: (v: ExpiryFilter) => void;
  supplierFilter: string;
  setSupplierFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  suppliers: string[];
  categories: string[];
  statusCounts: { all: number; open: number; inProgress: number; closed: number };
  expiringSoonCount: number;
  expiredCount: number;
  dateInfo: { currentMonthName: string; nextMonthName: string };
}) {
  const tabs = [
    { id: 'all', label: 'All Visas', count: statusCounts.all },
    { id: 'Open', label: 'Open', count: statusCounts.open },
    { id: 'In Progress', label: 'In Progress', count: statusCounts.inProgress },
    { id: 'expiring_soon', label: 'Expiring Soon', count: expiringSoonCount },
    { id: 'expired_active', label: 'Expired', count: expiredCount },
    { id: 'Closed', label: 'Closed', count: statusCounts.closed },
  ];

  const selectTab = (id: string) => {
    if (id === 'all') { setStatusFilter('all'); setExpiryFilter('all'); }
    else if (id === 'expiring_soon') { setStatusFilter('all'); setExpiryFilter('in_30_days'); }
    else if (id === 'expired_active') { setStatusFilter('all'); setExpiryFilter('expired'); }
    else { setStatusFilter(id); setExpiryFilter('all'); }
  };

  const isSelected = (id: string) =>
    (id === 'all' && statusFilter === 'all' && expiryFilter === 'all') ||
    (id === 'expiring_soon' && (expiryFilter === 'this_month' || expiryFilter === 'in_30_days')) ||
    (id === 'expired_active' && expiryFilter === 'expired') ||
    (statusFilter === id && expiryFilter === 'all');

  return (
    <div className="card-anthropic p-3.5 space-y-2.5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 opacity-40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef as any}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, passport, phone, ref ID..."
            className="w-full pl-9 pr-10 h-8 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${viewMode === 'list' ? 'bg-[#D97757] text-white' : 'border border-[var(--card-border)]'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setViewMode('kanban')} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-[#D97757] text-white' : 'border border-[var(--card-border)]'}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 border ${showFilters ? 'border-[#D97757] text-[#D97757]' : 'border-[var(--card-border)]'}`}>
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-[var(--card-border)] text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            className={`px-2.5 py-1 rounded-md font-medium shrink-0 flex items-center gap-1.5 cursor-pointer ${
              isSelected(tab.id) ? 'bg-[#D97757] text-white' : 'bg-[var(--sidebar-bg)]'
            }`}
          >
            {tab.label}
            <span className="font-mono text-[10px] opacity-80">{tab.count}</span>
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[var(--card-border)]">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">
            <option value="all">All Expiry Dates</option>
            <option value="this_month">This Month ({dateInfo.currentMonthName})</option>
            <option value="next_month">Next Month ({dateInfo.nextMonthName})</option>
            <option value="expired">Expired Visas</option>
            <option value="in_30_days">Within 30 Days</option>
          </select>
          <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
