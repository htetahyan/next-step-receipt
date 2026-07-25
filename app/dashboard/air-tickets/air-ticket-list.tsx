'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Plane, X, Eye, Trash2, Loader2, Copy } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService } from '@/app/actions/services';

import { STATUS_COLORS } from '@/lib/statusColors';
import Pagination from '@/components/Pagination';

export default function AirTicketList({ initialServices, customers }: { initialServices: any[]; customers: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const c = s.customers;
      const d = s.details as any;
      return [c?.name, c?.passport_no, s.reference_id, d?.destination, d?.handled_by]
        .some(v => v && String(v).toLowerCase().includes(q));
    });
  }, [services, search, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

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
    if (res.success) {
      setServices(services.filter(s => s.id !== id));
      toast.success("Deleted successfully");
    } else {
      toast.error(res.error);
    }
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

      {/* Search and Filters */}
      <div className="card-anthropic p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, passport, route, ref ID..." className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"><X className="w-4 h-4" /></button>}
        </div>
        
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
          >
            <option value="all">All Types</option>
            <option value="Air Ticket">Air Ticket</option>
            <option value="Dummy Ticket">Dummy Ticket</option>
            <option value="Ticket + Hotel Package">Ticket + Hotel Package</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
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
                        <Link href={`/dashboard/air-tickets/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`} className="p-1.5 rounded hover:bg-[var(--card-border)]" title="Duplicate"><Copy className="w-3.5 h-3.5" /></Link>
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
