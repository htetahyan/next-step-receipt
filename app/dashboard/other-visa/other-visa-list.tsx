'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Globe, X, Eye, Trash2, Loader2, Copy, FileSpreadsheet, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { deleteCustomerService } from '@/app/actions/services';

import { STATUS_COLORS } from '@/lib/statusColors';
import Pagination from '@/components/Pagination';

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
  const [showExportMenu, setShowExportMenu] = useState(false);
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
    else toast.error(res.error);
    setDeletingId(null);
  };

  // Group by category for summary
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    services.forEach(s => { map[s.category] = (map[s.category] || 0) + 1; });
    return map;
  }, [services]);

  const summary = useMemo(() => {
    let totalAmount = 0, totalReceiving = 0, totalSupplierCost = 0, totalProfit = 0;
    filtered.forEach(s => {
      const fin = s.financials as any;
      const amt = Number(fin?.amount) || 0;
      const recAmt = Number(fin?.receiving_amount !== undefined ? fin?.receiving_amount : (amt - Number(fin?.discount || 0)));
      totalAmount += amt;
      totalReceiving += recAmt;
      totalSupplierCost += Number(fin?.supplier_cost) || 0;
    });
    totalProfit = totalReceiving - totalSupplierCost;
    return { totalAmount, totalReceiving, totalSupplierCost, totalProfit, count: filtered.length };
  }, [filtered]);

  const exportData = (itemsToExport: any[], fileNamePrefix: string, format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!itemsToExport || itemsToExport.length === 0) {
      toast.error('No data to export!');
      return;
    }

    const rows = itemsToExport.map(s => {
      const cust = s.customers;
      const details = s.details as any;
      const fin = s.financials as any;

      const amt = Number(fin?.amount || 0);
      const receiving = Number(fin?.receiving_amount !== undefined ? fin?.receiving_amount : (amt - Number(fin?.discount || 0)));
      const supplierCost = Number(fin?.supplier_cost || 0);
      const profit = receiving - supplierCost;

      return {
        'Ref ID': s.reference_id || '',
        'Customer Name': cust?.name || '',
        'Phone Number': cust?.phone || '',
        'Passport Number': cust?.passport_no || '',
        'Category': s.category || '',
        'Destination': details?.destination || '',
        'Travel Date': details?.travel_period || '',
        'Status': s.status || '',
        'Amount (AED)': amt,
        'Receiving Amount (AED)': receiving,
        'Supplier Cost (AED)': supplierCost,
        'Gross Profit (AED)': profit,
        'Payment Method': fin?.payment_method || details?.payment_method || '',
      };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${fileNamePrefix}_${dateStr}`;

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...rows.map(r => String((r as any)[key] || '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    worksheet['!cols'] = colWidths;

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${rows.length} records to CSV!`);
    } else {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Other Visa');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success(`Exported ${rows.length} records to Excel (.xlsx)!`);
    }

    setShowExportMenu(false);
  };

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
        <div className="flex items-center gap-3">
          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--sidebar-bg)] transition-all shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span>Export (.xlsx)</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-1.5 shadow-xl z-50 text-xs">
                <div className="px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 border-b border-[var(--card-border)] mb-1">
                  Export Options
                </div>
                <button
                  onClick={() => exportData(filtered, 'Other_Visa_Filtered', 'xlsx')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export Filtered List (.xlsx)</span>
                  <span className="font-mono text-[10px] opacity-60">{filtered.length}</span>
                </button>
                <button
                  onClick={() => exportData(services, 'Other_Visa_All_Records', 'xlsx')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export All Records (.xlsx)</span>
                  <span className="font-mono text-[10px] opacity-60">{services.length}</span>
                </button>
                <div className="border-t border-[var(--card-border)] my-1" />
                <button
                  onClick={() => exportData(filtered, 'Other_Visa_Filtered', 'csv')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium opacity-80"
                >
                  <span>Export as CSV (.csv)</span>
                  <span className="font-mono text-[10px] opacity-60">CSV</span>
                </button>
              </div>
            )}
          </div>

          <Link href="/dashboard/other-visa/new" className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] hover:opacity-90 shadow-sm">
            <Plus className="h-4 w-4" /> New Application
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Amount', value: summary.totalAmount, color: 'text-slate-900 dark:text-white' },
          { label: 'Receiving', value: summary.totalReceiving, color: 'text-blue-600' },
          { label: 'Supplier Cost', value: summary.totalSupplierCost, color: 'text-amber-600' },
          { label: 'Gross Profit', value: summary.totalProfit, color: summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="card-anthropic p-5">
            <div className="text-xs uppercase tracking-wider opacity-50 mb-2">{card.label}</div>
            <div className={`text-xl font-mono font-bold ${card.color || ''}`}>
              {card.value.toLocaleString()} <span className="text-xs font-normal opacity-60">AED</span>
            </div>
          </div>
        ))}
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
                        <Link href={`/dashboard/other-visa/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`} className="p-1.5 rounded hover:bg-[var(--card-border)]" title="Duplicate"><Copy className="w-3.5 h-3.5" /></Link>
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
