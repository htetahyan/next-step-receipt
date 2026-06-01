'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Globe, X, Eye, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService } from '@/app/actions/services';

const STATUS_COLORS: Record<string, string> = {
  'Open': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Closed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const COUNTRY_EMOJI: Record<string, string> = {
  'Japan Visa': '🇯🇵',
  'Schengen / EU Visa': '🇪🇺',
  'China Visa': '🇨🇳',
  'Korea Visa': '🇰🇷',
  'Armenia Visa': '🇦🇲',
  'UK Visa': '🇬🇧',
  'Other Country Visa': '🌍',
  'Consultation Only': '💬',
};

export default function OtherVisaList({ initialServices, customers }: { initialServices: any[]; customers: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = useMemo(() => {
    return services.filter(s => {
      const c = s.customers;
      const d = s.details as any;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [c?.name, c?.passport_no, c?.email, s.reference_id, d?.destination]
        .some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [services, search, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // Reset page when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    setDeletingId(id);
    const res = await deleteCustomerService(id);
    if (res.success) setServices(services.filter(s => s.id !== id));
    else alert(res.error);
    setDeletingId(null);
  };

  // Group by category for summary
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    services.forEach(s => { map[s.category] = (map[s.category] || 0) + 1; });
    return map;
  }, [services]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-3">
            <Globe className="w-7 h-7 text-[#D97757] opacity-80" />
            Other Visa & Consultation
          </h1>
          <p className="text-sm opacity-60 mt-1 font-mono">{services.length} records</p>
        </div>
        <Link href="/dashboard/other-visa/new" className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] hover:opacity-90 shadow-sm">
          <Plus className="h-4 w-4" /> New Application
        </Link>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === 'all' ? 'bg-[#D97757] text-white' : 'bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)]'}`}>
          All ({services.length})
        </button>
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${categoryFilter === cat ? 'bg-[#D97757] text-white' : 'bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)]'}`}>
            <span>{COUNTRY_EMOJI[cat] || '🌍'}</span> {cat} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card-anthropic p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, passport, email, destination..." className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Table */}
      <div className="card-anthropic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-[10px] uppercase tracking-wider opacity-70">
              <tr>
                <th className="px-4 py-3 font-medium">Ref ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Application Date</th>
                <th className="px-4 py-3 font-medium">Travel Period</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Handled By</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems.map(service => {
                const customer = service.customers;
                const details = service.details as any;
                const fin = service.financials as any;
                return (
                  <tr key={service.id} className="hover:bg-[var(--sidebar-bg)] transition-colors group">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-[#D97757] font-semibold">{service.reference_id || '—'}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{customer?.name}</div>
                      <div className="text-[11px] opacity-50 font-mono">{customer?.passport_no || '—'} · {customer?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{COUNTRY_EMOJI[service.category] || '🌍'} {details?.destination || '—'}</td>
                    <td className="px-4 py-3 text-xs">{service.category}</td>
                    <td className="px-4 py-3 text-xs font-mono">{details?.application_date || '—'}</td>
                    <td className="px-4 py-3 text-xs">{details?.travel_period || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{Number(fin?.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{details?.handled_by || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[service.status] || 'bg-gray-100 text-gray-600'}`}>{service.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/other-visa/${service.id}`} className="p-1.5 rounded hover:bg-[var(--card-border)]"><Eye className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => handleDelete(service.id)} disabled={deletingId === service.id} className="p-1.5 rounded hover:bg-[var(--card-border)] hover:text-red-500">
                          {deletingId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-16 text-center">
                  <div className="inline-flex flex-col items-center gap-3">
                    <Globe className="w-10 h-10 opacity-20" />
                    <p className="opacity-50 font-serif">No visa applications found.</p>
                    <Link href="/dashboard/other-visa/new" className="text-[#D97757] text-sm font-medium hover:underline">Add your first application</Link>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--card-border)] bg-[var(--sidebar-bg)] px-6 py-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs opacity-60 font-mono">
                  Showing <span className="font-semibold text-[var(--foreground)]">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-semibold text-[var(--foreground)]">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                  <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-[0.95]"
                  >
                    Previous
                  </button>
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) {
                      start = Math.max(1, end - maxVisible + 1);
                    }
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                    return pages.map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.05] active:scale-[0.95] ${
                          currentPage === pageNum
                            ? 'bg-[#D97757] text-[#F5F4EF] border border-[#D97757]'
                            : 'border border-[var(--card-border)] bg-[var(--background)] hover:bg-[var(--sidebar-bg)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ));
                  })()}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs font-semibold hover:bg-[var(--sidebar-bg)] disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-[0.95]"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
