'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Plane, X, Eye, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService } from '@/app/actions/services';

const STATUS_COLORS: Record<string, string> = {
  'Open': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Closed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function AirTicketList({ initialServices, customers }: { initialServices: any[]; customers: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(s => {
      const c = s.customers;
      const d = s.details as any;
      return [c?.name, c?.passport_no, s.reference_id, d?.destination, d?.handled_by]
        .some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [services, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const summary = useMemo(() => {
    let totalAmount = 0, totalAirlineCost = 0;
    filtered.forEach(s => {
      const fin = s.financials as any;
      totalAmount += Number(fin?.amount) || 0;
      totalAirlineCost += Number(fin?.supplier_cost) || 0;
    });
    return { totalAmount, totalAirlineCost, profit: totalAmount - totalAirlineCost, count: filtered.length };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ticket record?')) return;
    setDeletingId(id);
    const res = await deleteCustomerService(id);
    if (res.success) setServices(services.filter(s => s.id !== id));
    else alert(res.error);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-3">
            <Plane className="w-7 h-7 text-[#D97757] opacity-80" />
            Air Tickets
          </h1>
          <p className="text-sm opacity-60 mt-1 font-mono">{summary.count} records</p>
        </div>
        <Link href="/dashboard/air-tickets/new" className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] hover:opacity-90 shadow-sm">
          <Plus className="h-4 w-4" /> New Ticket Record
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Charged', value: summary.totalAmount },
          { label: 'Airline Cost', value: summary.totalAirlineCost },
          { label: 'Profit', value: summary.profit, color: summary.profit >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="card-anthropic p-5">
            <div className="text-xs uppercase tracking-wider opacity-50 mb-2">{card.label}</div>
            <div className={`text-xl font-mono font-bold ${card.color || ''}`}>{card.value.toLocaleString()} <span className="text-xs font-normal opacity-60">AED</span></div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card-anthropic p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, passport, route, ref ID..." className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]" />
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
                <th className="px-4 py-3 font-medium">Route / Destination</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Booking Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Airline Cost</th>
                <th className="px-4 py-3 font-medium">Payment</th>
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
                      <div className="text-[11px] opacity-50 font-mono">{customer?.passport_no || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">{details?.destination || '—'}</td>
                    <td className="px-4 py-3 text-xs">{service.category}</td>
                    <td className="px-4 py-3 text-xs font-mono">{details?.booking_date || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{Number(fin?.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{Number(fin?.supplier_cost || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{fin?.payment_method || '—'}</td>
                    <td className="px-4 py-3 text-xs">{details?.handled_by || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[service.status] || 'bg-gray-100 text-gray-600'}`}>{service.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/air-tickets/${service.id}`} className="p-1.5 rounded hover:bg-[var(--card-border)]" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => handleDelete(service.id)} disabled={deletingId === service.id} className="p-1.5 rounded hover:bg-[var(--card-border)] hover:text-red-500" title="Delete">
                          {deletingId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-16 text-center">
                  <div className="inline-flex flex-col items-center gap-3">
                    <Plane className="w-10 h-10 opacity-20" />
                    <p className="opacity-50 font-serif">No ticket records found.</p>
                    <Link href="/dashboard/air-tickets/new" className="text-[#D97757] text-sm font-medium hover:underline">Add your first record</Link>
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
