'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, FileSpreadsheet, ChevronDown, Wrench, Trash2, Edit3, Receipt, Pencil, Check, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService, updateServiceRefId } from '@/app/actions/services';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import Pagination from '@/components/Pagination';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { UserProfile, checkPermission } from '@/lib/auth-permissions';

interface Props {
  initialServices: any[];
  customers: any[];
  profile?: UserProfile | null;
}

export default function CustomServiceList({ initialServices, customers, profile }: Props) {
  const router = useRouter();
  const canCreate = checkPermission(profile || null, 'custom_service', 'create');
  const canEdit = checkPermission(profile || null, 'custom_service', 'edit');
  const canDelete = checkPermission(profile || null, 'custom_service', 'delete');

  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ref: string; name: string } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Inline Reference ID Editing State
  const [editingRefId, setEditingRefId] = useState<{ id: string; value: string } | null>(null);
  const [isSavingRef, setIsSavingRef] = useState(false);

  const handleSaveRefId = async (serviceId: string, newRef: string) => {
    setIsSavingRef(true);
    try {
      const res = await updateServiceRefId(serviceId, newRef);
      if (res.success) {
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, reference_id: res.reference_id } : s));
        toast.success(`Reference ID updated to "${res.reference_id}"`);
        setEditingRefId(null);
      } else {
        toast.error(res.error || 'Failed to update Reference ID');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating Reference ID');
    } finally {
      setIsSavingRef(false);
    }
  };

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
          s.category,
          details?.supplier_name,
          details?.handled_by,
          details?.referred_by,
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
        'Ref ID': s.reference_id,
        'Date Booked': s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '',
        'Customer': cust?.name || '',
        'Service Name': s.category,
        'Status': s.status,
        'Amount': amt,
        'Discount': discount,
        'Total Payment': totalPayment,
        'Supplier Cost': supplierCost,
        'GP': profit,
        'Supplier Name': details?.supplier_name || '',
        'Handled By': details?.handled_by || '',
        'Referred By': details?.referred_by || '',
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Services');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success(`Exported ${rows.length} records to Excel (.xlsx)!`);
    }

    setShowExportMenu(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    const res = await deleteCustomerService(deleteTarget.id);
    if (res.success) {
      setServices(services.filter(s => s.id !== deleteTarget.id));
      toast.success('Custom service record deleted');
    } else {
      toast.error(res.error || 'Failed to delete record');
    }
    setDeletingId(null);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-4">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-3">
            <Wrench className="w-7 h-7 text-[#D97757] opacity-80" />
            Custom Services
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
                  onClick={() => exportData(filtered, 'Custom_Services', 'xlsx')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export as .xlsx</span>
                </button>
                <button
                  onClick={() => exportData(filtered, 'Custom_Services', 'csv')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export as .csv</span>
                </button>
              </div>
            )}
          </div>

          {canCreate && (
            <Link
              href="/dashboard/custom-service/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] transition-all hover:opacity-90 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Service
            </Link>
          )}
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
              placeholder="Search services..."
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
                <th className="px-4 py-3 font-medium">Ref ID</th>
                <th className="px-4 py-3 font-medium">Service Name</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Total Payment</th>
                <th className="px-4 py-3 font-medium text-right">Supplier Cost</th>
                <th className="px-4 py-3 font-medium text-right">GP</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems.map(s => {
                const cust = s.customers;
                const fin = s.financials as any;
                const details = s.details as any;

                const amt = Number(fin?.amount || 0);
                const discount = Number(fin?.discount || 0);
                const totalPayment = Number(fin?.receiving_amount !== undefined ? fin?.receiving_amount : (amt - discount));
                const supplierCost = Number(fin?.supplier_cost || 0);
                const gp = totalPayment - supplierCost;

                return (
                  <tr key={s.id} className="hover:bg-[var(--sidebar-bg)] transition-colors">
                    <td className="px-4 py-3">
                      {editingRefId?.id === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingRefId?.value || ''}
                            onChange={(e) => setEditingRefId({ id: s.id, value: e.target.value.toUpperCase() })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editingRefId) handleSaveRefId(s.id, editingRefId.value);
                              if (e.key === 'Escape') setEditingRefId(null);
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono font-bold w-24 rounded border border-[#D97757] bg-[var(--background)] text-[#D97757] uppercase focus:outline-none shadow-xs"
                          />
                          <button
                            disabled={isSavingRef}
                            onClick={() => editingRefId && handleSaveRefId(s.id, editingRefId.value)}
                            className="p-1 hover:bg-emerald-500/10 text-emerald-600 rounded transition-colors"
                            title="Save Reference ID"
                          >
                            {isSavingRef ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setEditingRefId(null)}
                            className="p-1 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className={`inline-flex items-center gap-1.5 group/ref ${canEdit ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (canEdit) {
                              setEditingRefId({ id: s.id, value: s.reference_id || '' });
                            }
                          }}
                          title={canEdit ? "Click to edit Reference ID" : undefined}
                        >
                          <span className="font-mono text-xs text-[#D97757] font-semibold group-hover/ref:underline">
                            {s.reference_id || '—'}
                          </span>
                          {canEdit && (
                            <Pencil className="w-3 h-3 opacity-0 group-hover/ref:opacity-70 text-[#D97757] transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">{s.category}</td>
                    <td className="px-4 py-3 font-medium">
                      <div>{cust?.name || '—'}</div>
                      {details?.handled_by && (
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                          By: {details.handled_by}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-md text-[10px] font-medium border border-[var(--card-border)] bg-[var(--sidebar-bg)]">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{amt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">{totalPayment.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{supplierCost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{gp.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/invoices/new?serviceId=${s.id}`}
                          className="p-1.5 opacity-60 hover:opacity-100 hover:text-emerald-600 transition-colors rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950 cursor-pointer"
                          title="Generate Invoice"
                        >
                          <Receipt className="w-4 h-4" />
                        </Link>
                        {canEdit && (
                          <Link
                            href={`/dashboard/custom-service/${s.id}`}
                            className="p-1.5 opacity-60 hover:opacity-100 hover:text-[#D97757] transition-colors rounded-md hover:bg-[#D97757]/10 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget({
                              id: s.id,
                              ref: s.reference_id,
                              name: s.category
                            })}
                            disabled={deletingId === s.id}
                            className="p-1.5 opacity-60 hover:opacity-100 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-30 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center opacity-50 font-serif">
                    No custom services found.
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Custom Service Record"
        itemType="custom service record"
        itemName={deleteTarget ? `${deleteTarget.ref} (${deleteTarget.name})` : ''}
        isDeleting={!!deletingId}
        description="Are you sure you want to delete this custom service record? This action cannot be undone."
      />
    </div>
  );
}
