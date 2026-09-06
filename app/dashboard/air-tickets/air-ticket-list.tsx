'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Plane, X, Eye, Trash2, Loader2, Copy, FileSpreadsheet, ChevronDown, Pencil, Check } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { deleteCustomerService, updateServiceRefId } from '@/app/actions/services';

import { STATUS_COLORS } from '@/lib/statusColors';
import Pagination from '@/components/Pagination';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { UserProfile, checkPermission } from '@/lib/auth-permissions';

export default function AirTicketList({
  initialServices,
  customers,
  profile,
}: {
  initialServices: any[];
  customers: any[];
  profile?: UserProfile | null;
}) {
  const canCreate = checkPermission(profile || null, 'air_tickets', 'create');
  const canEdit = checkPermission(profile || null, 'air_tickets', 'edit');
  const canDelete = checkPermission(profile || null, 'air_tickets', 'delete');

  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ref: string; name: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
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
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const c = s.customers;
      const d = s.details as any;
      return [
        c?.name,
        c?.passport_no,
        c?.phone,
        s.reference_id,
        d?.airline,
        d?.sector,
        d?.pnr,
        d?.ticket_no,
        d?.destination,
        d?.handled_by,
        ...(d?.passengers || []).map((p: any) => p.name),
        ...(d?.passengers || []).map((p: any) => p.passport_no),
        ...(d?.passengers || []).map((p: any) => p.ticket_no),
      ].some(v => v && String(v).toLowerCase().includes(q));
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
        'Category / Mode': s.category || '',
        'Airline': details?.airline || '',
        'PNR': details?.pnr || '',
        'Ticket No': details?.ticket_no || '',
        'Sector': details?.destination || '',
        'Travel Date': details?.travel_date || '',
        'Return Date': details?.return_date || '',
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Air Tickets');
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
      toast.success("Ticket record deleted");
    } else {
      toast.error(res.error || 'Failed to delete record');
    }
    setDeletingId(null);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--card-border)] pb-3">
        <div>
          <h1 className="text-xl font-serif font-normal tracking-tight flex items-center gap-2">
            <Plane className="w-5 h-5 text-[#D97757] opacity-80" />
            Air Tickets
          </h1>
          <p className="text-xs opacity-60 font-mono mt-0.5">{summary.count} records</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 h-8.5 text-xs font-medium hover:bg-[var(--sidebar-bg)] transition-all shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-1.5 shadow-xl z-50 text-xs">
                <div className="px-3 py-1 font-semibold text-[10px] uppercase tracking-wider opacity-50 border-b border-[var(--card-border)] mb-1">
                  Export Options
                </div>
                <button
                  onClick={() => exportData(filtered, 'Air_Tickets_Filtered', 'xlsx')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export Filtered List (.xlsx)</span>
                  <span className="font-mono text-[10px] opacity-60">{filtered.length}</span>
                </button>
                <button
                  onClick={() => exportData(services, 'Air_Tickets_All_Records', 'xlsx')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export All Records (.xlsx)</span>
                  <span className="font-mono text-[10px] opacity-60">{services.length}</span>
                </button>
                <div className="border-t border-[var(--card-border)] my-1" />
                <button
                  onClick={() => exportData(filtered, 'Air_Tickets_Filtered', 'csv')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium opacity-80"
                >
                  <span>Export as CSV (.csv)</span>
                  <span className="font-mono text-[10px] opacity-60">CSV</span>
                </button>
              </div>
            )}
          </div>

          {canCreate && (
            <Link href="/dashboard/air-tickets/new" className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97757] px-3.5 h-8.5 text-xs font-medium text-[#F5F4EF] hover:opacity-90 shadow-sm cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> New Ticket
            </Link>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Total Amount', value: summary.totalAmount, color: 'text-slate-900 dark:text-white' },
          { label: 'Receiving', value: summary.totalReceiving, color: 'text-blue-600' },
          { label: 'Supplier Cost', value: summary.totalSupplierCost, color: 'text-amber-600' },
          { label: 'Gross Profit', value: summary.totalProfit, color: summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="card-anthropic p-3">
            <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">{card.label}</div>
            <div className={`text-base font-mono font-bold ${card.color || ''}`}>{card.value.toLocaleString()} <span className="text-[10px] font-normal opacity-60">AED</span></div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="card-anthropic p-3 flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <Search className="w-4 h-4 opacity-40" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, passport, route, ref ID..."
            className="w-full pl-9 pr-9 h-8.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
          />
          {search && (
            <div className="absolute right-2.5 inset-y-0 flex items-center">
              <button onClick={() => setSearch('')} className="opacity-40 hover:opacity-80 p-0.5 cursor-pointer flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-8.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
          >
            <option value="all">All Types</option>
            <option value="Air Ticket">Air Ticket</option>
            <option value="Dummy Ticket">Dummy Ticket</option>
            <option value="Ticket + Hotel Package">Ticket + Hotel Package</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
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
        <div className="overflow-x-auto max-h-[calc(100vh-230px)] relative">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] backdrop-blur-md text-[10px] uppercase tracking-wider opacity-90 shadow-xs">
              <tr>
                <th className="px-3 py-2 font-semibold">Ref ID</th>
                <th className="px-3 py-2 font-semibold">Customer</th>
                <th className="px-3 py-2 font-semibold">Route / Destination</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Booking Date</th>
                <th className="px-3 py-2 font-semibold text-right">Amount</th>
                <th className="px-3 py-2 font-semibold text-right">Airline Cost</th>
                <th className="px-3 py-2 font-semibold">Payment</th>
                <th className="px-3 py-2 font-semibold">Handled By</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems.map(service => {
                const customer = service.customers;
                const details = service.details as any;
                const fin = service.financials as any;
                return (
                  <tr key={service.id} className="hover:bg-[var(--sidebar-bg)] transition-colors group">
                    <td className="px-3 py-1.5 text-xs">
                      {editingRefId?.id === service.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingRefId?.value || ''}
                            onChange={(e) => setEditingRefId({ id: service.id, value: e.target.value.toUpperCase() })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editingRefId) handleSaveRefId(service.id, editingRefId.value);
                              if (e.key === 'Escape') setEditingRefId(null);
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 text-xs font-mono font-bold w-24 rounded border border-[#D97757] bg-[var(--background)] text-[#D97757] uppercase focus:outline-none shadow-xs"
                          />
                          <button
                            disabled={isSavingRef}
                            onClick={() => editingRefId && handleSaveRefId(service.id, editingRefId.value)}
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
                              setEditingRefId({ id: service.id, value: service.reference_id || '' });
                            }
                          }}
                          title={canEdit ? "Click to edit Reference ID" : undefined}
                        >
                          <span className="font-mono text-xs text-[#D97757] font-semibold group-hover/ref:underline">
                            {service.reference_id || '—'}
                          </span>
                          {canEdit && (
                            <Pencil className="w-3 h-3 opacity-0 group-hover/ref:opacity-70 text-[#D97757] transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      <div className="font-medium text-xs flex items-center gap-1.5">
                        <span>{customer?.name}</span>
                        {details?.passengers && details.passengers.length > 1 && (
                          <span 
                            className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#D97757]/15 text-[#D97757] font-semibold font-mono cursor-help shrink-0"
                            title={`Travelers (${details.passengers.length}):\n${details.passengers.map((p: any, i: number) => `${i + 1}. ${p.name || 'Pax'} (${p.passport_no || 'No Pass'})`).join('\n')}`}
                          >
                            {details.passengers.length} Pax
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] opacity-50 font-mono">{customer?.passport_no || '—'}</div>
                    </td>
                    <td className="px-3 py-1.5 text-xs font-medium">{details?.destination || '—'}</td>
                    <td className="px-3 py-1.5 text-xs">{service.category}</td>
                    <td className="px-3 py-1.5 text-xs font-mono">{details?.booking_date || '—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{Number(fin?.amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{Number(fin?.supplier_cost || 0).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-xs">{fin?.payment_method || '—'}</td>
                    <td className="px-3 py-1.5 text-xs">{details?.handled_by || '—'}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[service.status] || 'bg-gray-100 text-gray-600'}`}>{service.status}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canCreate && (
                          <Link href={`/dashboard/air-tickets/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`} className="p-1.5 rounded hover:bg-[var(--card-border)] cursor-pointer" title="Duplicate"><Copy className="w-3.5 h-3.5" /></Link>
                        )}
                        {canEdit && (
                          <Link href={`/dashboard/air-tickets/${service.id}`} className="p-1.5 rounded hover:bg-[var(--card-border)] cursor-pointer" title="View / Edit"><Eye className="w-3.5 h-3.5" /></Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget({
                              id: service.id,
                              ref: service.reference_id,
                              name: customer?.name || (details as any)?.customer_name || 'Ticket'
                            })}
                            disabled={deletingId === service.id}
                            className="p-1.5 rounded hover:bg-[var(--card-border)] hover:text-red-500 cursor-pointer transition-colors"
                            title="Delete"
                          >
                            {deletingId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {!canCreate && !canEdit && !canDelete && (
                          <span className="text-[10px] opacity-40 font-mono">View Only</span>
                        )}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Air Ticket Record"
        itemType="air ticket record"
        itemName={deleteTarget ? `${deleteTarget.ref} (${deleteTarget.name})` : ''}
        isDeleting={!!deletingId}
        description="Are you sure you want to delete this air ticket record? This action cannot be undone."
      />
    </div>
  );
}
