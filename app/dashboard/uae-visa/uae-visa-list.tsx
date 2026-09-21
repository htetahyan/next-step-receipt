'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteCustomerService, quickUpdateService, updateServiceRefId } from '@/app/actions/services';
import { autoCloseExpiredVisas } from '@/app/actions/auto-close-visas';
import OdooQuickEditDrawer from '@/components/OdooQuickEditDrawer';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import OdooKanbanView from '@/components/OdooKanbanView';
import { UserProfile, checkPermission } from '@/lib/auth-permissions';
import { useRemoteServiceSearch } from '@/lib/useRemoteServiceSearch';
import { useRecordScope } from '@/lib/useRecordScope';
import { isUaeVisaCategory } from '@/lib/service-constants';
import {
  UAE_VISA_LIST_FILTER,
  ExpiryFilter,
  buildExpiryAlerts,
  exportVisaSpreadsheet,
  filterAndSortVisas,
  getExpiryInfo,
  getVisaDateInfo,
} from '@/lib/visaTracker';
import VisaListToolbar from './components/VisaListToolbar';
import VisaExpiryAlerts from './components/VisaExpiryAlerts';
import VisaListFilters from './components/VisaListFilters';
import VisaListTable from './components/VisaListTable';

export default function UAEVisaList({ initialServices, profile }: { initialServices: any[]; customers?: any[]; profile?: UserProfile | null }) {
  const router = useRouter();
  const canCreate = checkPermission(profile || null, 'uae_visa', 'create');
  const canEdit = checkPermission(profile || null, 'uae_visa', 'edit');
  const canDelete = checkPermission(profile || null, 'uae_visa', 'delete');
  void canCreate;

  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  useRemoteServiceSearch(search, setServices, UAE_VISA_LIST_FILTER);
  const scope = useRecordScope(setServices, UAE_VISA_LIST_FILTER);

  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [expiryTab, setExpiryTab] = useState<'all' | 'this_month' | 'next_month' | 'expired'>('expired');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRefId, setEditingRefId] = useState<{ id: string; value: string } | null>(null);
  const [isSavingRef, setIsSavingRef] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ref: string; name: string } | null>(null);
  const [autoClosing, setAutoClosing] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [density, setDensity] = useState<'compact' | 'normal'>('compact');
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 15;

  const visaOnly = useMemo(() => services.filter((s) => isUaeVisaCategory(s.category)), [services]);
  const dateInfo = useMemo(() => getVisaDateInfo(), []);
  const expiryOf = (s: any) => getExpiryInfo(s, dateInfo);

  const filtered = useMemo(
    () => filterAndSortVisas(visaOnly, { search, statusFilter, supplierFilter, categoryFilter, expiryFilter, dateInfo }),
    [visaOnly, search, statusFilter, supplierFilter, categoryFilter, expiryFilter, dateInfo]
  );
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const summary = useMemo(() => {
    let totalAmount = 0, totalReceiving = 0, totalSupplierCost = 0;
    filtered.forEach((s) => {
      const fin = s.financials || {};
      const amt = Number(fin.amount) || 0;
      totalAmount += amt;
      totalReceiving += Number(fin.receiving_amount !== undefined ? fin.receiving_amount : amt - Number(fin.discount || 0));
      totalSupplierCost += Number(fin.supplier_cost) || 0;
    });
    return { totalAmount, totalReceiving, totalSupplierCost, totalProfit: totalReceiving - totalSupplierCost, count: filtered.length };
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const counts = { all: visaOnly.length, open: 0, inProgress: 0, closed: 0 };
    visaOnly.forEach((s) => {
      if (s.status === 'Open') counts.open++;
      else if (s.status === 'In Progress') counts.inProgress++;
      else if (s.status === 'Closed') counts.closed++;
    });
    return counts;
  }, [visaOnly]);

  const expiryAlertData = useMemo(() => buildExpiryAlerts(visaOnly, dateInfo), [visaOnly, dateInfo]);
  const displayedAlerts = expiryTab === 'this_month' ? expiryAlertData.thisMonthList
    : expiryTab === 'next_month' ? expiryAlertData.nextMonthList
    : expiryTab === 'expired' ? expiryAlertData.expiredList
    : expiryAlertData.allAlerts;

  const suppliers = useMemo(() => Array.from(new Set(visaOnly.map((s) => s.details?.visa_supplier).filter(Boolean))).sort() as string[], [visaOnly]);
  const categories = useMemo(() => Array.from(new Set(visaOnly.map((s) => s.category).filter(Boolean))).sort() as string[], [visaOnly]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('uae_visa_density');
      if (saved === 'compact' || saved === 'normal') setDensity(saved);
    } catch {}
  }, []);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, supplierFilter, categoryFilter, expiryFilter]);

  const handleQuickStatus = async (serviceId: string, nextStatus: string) => {
    if (!canEdit) return;
    const prev = services.find((s) => s.id === serviceId)?.status;
    if (prev === nextStatus) return;
    setStatusSavingId(serviceId);
    setServices((list) => list.map((s) => (s.id === serviceId ? { ...s, status: nextStatus } : s)));
    const res = await quickUpdateService(serviceId, { status: nextStatus });
    if (res.success && res.service) {
      setServices((list) => list.map((s) => (s.id === serviceId ? res.service : s)));
      toast.success(`Status → ${nextStatus}`);
    } else {
      setServices((list) => list.map((s) => (s.id === serviceId ? { ...s, status: prev } : s)));
      toast.error(res.error || 'Failed to update status');
    }
    setStatusSavingId(null);
  };

  const handleSaveRefId = async (serviceId: string, newRef: string) => {
    setIsSavingRef(true);
    const res = await updateServiceRefId(serviceId, newRef);
    if (res.success) {
      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, reference_id: res.reference_id } : s)));
      toast.success(`Reference ID updated to "${res.reference_id}"`);
      setEditingRefId(null);
    } else toast.error(res.error || 'Failed to update Reference ID');
    setIsSavingRef(false);
  };

  const handleAutoClose = async () => {
    setAutoClosing(true);
    const result = await autoCloseExpiredVisas();
    if (result.error) toast.error(`Auto-close failed: ${result.error}`);
    else if (result.closed === 0) toast.info('No expired visas found to close.');
    else {
      toast.success(`Closed ${result.closed} expired visa(s).`);
      router.refresh();
    }
    setAutoClosing(false);
  };

  const doExport = (items: any[], prefix: string, format: 'xlsx' | 'csv' = 'xlsx') => {
    exportVisaSpreadsheet(items, prefix, format, dateInfo);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-3.5 pb-16">
      <VisaListToolbar
        visaCount={summary.count}
        summary={summary}
        density={density}
        autoClosing={autoClosing}
        showExportMenu={showExportMenu}
        dateInfo={dateInfo}
        visaOnly={visaOnly}
        filtered={filtered}
        expiredCount={expiryAlertData.expiredList.length}
        thisMonthCount={expiryAlertData.thisMonthList.length}
        expiryFilter={expiryFilter}
        scope={scope}
        onToggleDensity={() => setDensity((d) => {
          const next = d === 'compact' ? 'normal' : 'compact';
          try { localStorage.setItem('uae_visa_density', next); } catch {}
          return next;
        })}
        onToggleExport={() => setShowExportMenu((v) => !v)}
        onExport={doExport}
        onAutoClose={handleAutoClose}
        onExpiredChip={() => { setExpiryFilter(expiryFilter === 'expired' ? 'all' : 'expired'); setStatusFilter('all'); }}
        onThisMonthChip={() => { setExpiryFilter(expiryFilter === 'this_month' ? 'all' : 'this_month'); setStatusFilter('all'); }}
      />

      <VisaExpiryAlerts
        alerts={expiryAlertData}
        displayed={displayedAlerts}
        expiryTab={expiryTab}
        expiryFilter={expiryFilter}
        dateInfo={dateInfo}
        expanded={isAlertsExpanded}
        onToggleExpanded={() => setIsAlertsExpanded((v) => !v)}
        onTab={setExpiryTab}
        onFilterTable={(f) => { setExpiryFilter(f); setStatusFilter('all'); }}
        onExport={doExport}
      />

      <VisaListFilters
        search={search}
        setSearch={setSearch}
        searchRef={searchRef}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        expiryFilter={expiryFilter}
        setExpiryFilter={setExpiryFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        suppliers={suppliers}
        categories={categories}
        statusCounts={statusCounts}
        expiringSoonCount={expiryAlertData.thisMonthList.length + expiryAlertData.nextMonthList.length}
        expiredCount={expiryAlertData.expiredList.length}
        dateInfo={dateInfo}
      />

      {viewMode === 'kanban' ? (
        <OdooKanbanView
          services={filtered}
          onSelectService={(s) => { setSelectedService(s); setIsDrawerOpen(true); }}
          onQuickStatusChange={handleQuickStatus}
          getExpiryInfo={expiryOf}
        />
      ) : (
        <VisaListTable
          items={paginatedItems}
          density={density}
          dateInfo={dateInfo}
          getExpiryInfo={expiryOf}
          canEdit={canEdit}
          canDelete={canDelete}
          statusSavingId={statusSavingId}
          editingRefId={editingRefId}
          isSavingRef={isSavingRef}
          deletingId={deletingId}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onOpen={(s) => { setSelectedService(s); setIsDrawerOpen(true); }}
          onStatus={handleQuickStatus}
          onSaveRef={handleSaveRefId}
          setEditingRefId={setEditingRefId}
          onDeleteTarget={setDeleteTarget}
        />
      )}

      <OdooQuickEditDrawer
        service={selectedService}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={(updated) => {
          setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          setSelectedService(updated);
        }}
        onDelete={(id) => { setServices((prev) => prev.filter((s) => s.id !== id)); setIsDrawerOpen(false); }}
        canDelete={canDelete}
        suppliersList={suppliers}
        categoriesList={categories}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeletingId(deleteTarget.id);
          const res = await deleteCustomerService(deleteTarget.id);
          if (res.success) {
            setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
            toast.success('Visa record deleted');
          } else toast.error(res.error || 'Failed to delete record');
          setDeletingId(null);
          setDeleteTarget(null);
        }}
        title="Delete Visa Record"
        itemType="visa record"
        itemName={deleteTarget ? `${deleteTarget.ref} (${deleteTarget.name})` : ''}
        isDeleting={!!deletingId}
        description="Are you sure you want to delete this visa record? This action cannot be undone."
      />
    </div>
  );
}
