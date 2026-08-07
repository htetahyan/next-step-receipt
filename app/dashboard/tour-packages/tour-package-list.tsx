'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, FileSpreadsheet, ChevronDown, Map, Trash2, Edit3, Copy } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService } from '@/app/actions/services';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { STATUS_COLORS } from '@/lib/statusColors';
import Pagination from '@/components/Pagination';

interface Props {
  initialServices: any[];
  customers: any[];
}

export default function TourPackageList({ initialServices, customers }: Props) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = useMemo(() => {
    return services.filter(s => {
      const customer = s.customers;
      const details = s.details as any;

      if (search) {
        const q = search.toLowerCase();
        const matches = [
          customer?.name,
          customer?.phone,
          s.reference_id,
          details?.supplier_name,
          details?.tour_plans,
          details?.remark,
        ].some(v => v && String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      return true;
    });
  }, [services, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const summary = useMemo(() => {
    let totalAmount = 0, totalReceiving = 0, totalSupplierCost = 0, totalProfit = 0;
    filtered.forEach(s => {
      const fin = s.financials as any;
      const amt = Number(fin?.amount) || 0;
      const discount = Number(fin?.discount) || 0;
      const recAmt = Number(fin?.receiving_amount !== undefined ? fin?.receiving_amount : (amt - discount));
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

    const rows = itemsToExport.map((s, idx) => {
      const cust = s.customers;
      const details = s.details as any;
      const fin = s.financials as any;

      const amt = Number(fin?.amount || 0);
      const discount = Number(fin?.discount || 0);
      const totalPayment = Number(fin?.receiving_amount !== undefined ? fin?.receiving_amount : (amt - discount));
      const supplierCost = Number(fin?.supplier_cost || 0);
      const profit = totalPayment - supplierCost;

      return {
        'NO': idx + 1,
        'Date': details?.travel_date || '',
        'Customer': cust?.name || '',
        'Amount': amt,
        'Discount': discount,
        'Total Payment': totalPayment,
        'Payment to the suppliers': supplierCost,
        'GP': profit,
        'Supplier Name': details?.supplier_name || '',
        'Tour Plans': details?.tour_plans || '',
        'Remark': details?.remark || '',
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
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tour Packages');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success(`Exported ${rows.length} records to Excel (.xlsx)!`);
    }

    setShowExportMenu(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    setDeletingId(id);
    const res = await deleteCustomerService(id);
    if (res.success) {
      setServices(services.filter(s => s.id !== id));
      toast.success('Record deleted');
    } else {
      toast.error(res.error || 'Failed to delete record');
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-3">
            <Map className="w-7 h-7 text-[#D97757] opacity-80" />
            Tour Packages
          </h1>
          <p className="text-sm opacity-60 mt-1 font-mono">{summary.count} records</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--sidebar-bg)] transition-all shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-1.5 shadow-xl z-50 text-xs">
                <button
                  onClick={() => exportData(filtered, 'Tour_Packages', 'xlsx')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export as .xlsx</span>
                </button>
                <button
                  onClick={() => exportData(filtered, 'Tour_Packages', 'csv')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export as .csv</span>
                </button>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/tour-packages/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] transition-all hover:opacity-90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Tour Package
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Amount', value: summary.totalAmount, color: 'text-slate-900 dark:text-white' },
          { label: 'Receiving', value: summary.totalReceiving, color: 'text-blue-600' },
          { label: 'Supplier Cost', value: summary.totalSupplierCost, color: 'text-amber-600' },
          { label: 'Gross Profit', value: summary.totalProfit, color: summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="card-anthropic p-5">
            <div className="text-xs uppercase tracking-wider opacity-50 mb-2">{card.label}</div>
            <div className={`text-xl font-mono font-bold ${card.color}`}>
              {card.value.toLocaleString()} <span className="text-xs font-normal opacity-60">AED</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card-anthropic p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search packages..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[#D97757]"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="card-anthropic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--sidebar-bg)] border-b border-[var(--card-border)] text-xs uppercase tracking-wider opacity-60">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Discount</th>
                <th className="px-4 py-3 font-medium text-right">Total Payment</th>
                <th className="px-4 py-3 font-medium text-right">Supplier Cost</th>
                <th className="px-4 py-3 font-medium text-right">GP</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Tour Plans</th>
                <th className="px-4 py-3 font-medium">Remark</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems.map(s => {
                const cust = s.customers;
                const details = s.details as any;
                const fin = s.financials as any;

                const amt = Number(fin?.amount || 0);
                const discount = Number(fin?.discount || 0);
                const totalPayment = Number(fin?.receiving_amount !== undefined ? fin?.receiving_amount : (amt - discount));
                const supplierCost = Number(fin?.supplier_cost || 0);
                const gp = totalPayment - supplierCost;

                return (
                  <tr key={s.id} className="hover:bg-[var(--sidebar-bg)] transition-colors">
                    <td className="px-4 py-3">{details?.travel_date || '—'}</td>
                    <td className="px-4 py-3 font-medium">{cust?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">{amt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{discount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">{totalPayment.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{supplierCost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{gp.toLocaleString()}</td>
                    <td className="px-4 py-3">{details?.supplier_name || '—'}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate" title={details?.tour_plans}>{details?.tour_plans || '—'}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate" title={details?.remark}>{details?.remark || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/tour-packages/new?duplicate=${s.id}`}
                          className="p-1.5 opacity-60 hover:opacity-100 hover:text-blue-500 transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-950"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/tour-packages/${s.id}`}
                          className="p-1.5 opacity-60 hover:opacity-100 hover:text-[#D97757] transition-colors rounded-md hover:bg-[#D97757]/10"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 opacity-60 hover:opacity-100 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center opacity-50 font-serif">
                    No tour packages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
