'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, ChevronDown, Shield, X, Eye, Trash2, Loader2, PlusCircle, CheckCircle, AlertTriangle, Download, Phone, Calendar, FileSpreadsheet, Copy, LayoutGrid, List, Layers, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService, quickUpdateService } from '@/app/actions/services';
import { autoCloseExpiredVisas } from '@/app/actions/auto-close-visas';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { STATUS_COLORS } from '@/lib/statusColors';
import Pagination from '@/components/Pagination';
import OdooQuickEditDrawer from '@/components/OdooQuickEditDrawer';
import OdooKanbanView from '@/components/OdooKanbanView';

interface Props {
  initialServices: any[];
  customers: any[];
  profile?: UserProfile | null;
}

import { UserProfile, checkPermission } from '@/lib/auth-permissions';

export default function UAEVisaList({ initialServices, customers, profile }: Props) {
  const router = useRouter();
  const canCreate = checkPermission(profile || null, 'uae_visa', 'create');
  const canEdit = checkPermission(profile || null, 'uae_visa', 'edit');
  const canDelete = checkPermission(profile || null, 'uae_visa', 'delete');

  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'this_month' | 'next_month' | 'expired' | 'in_30_days'>('all');
  const [expiryTab, setExpiryTab] = useState<'all' | 'this_month' | 'next_month' | 'expired'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Odoo Specific View Modes & Quick Edit Drawer State
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'supplier' | 'category'>('none');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);

  const handleAutoClose = async () => {
    setAutoClosing(true);
    try {
      const result = await autoCloseExpiredVisas();
      if (result.error) {
        toast.error(`Auto-close failed: ${result.error}`);
      } else if (result.closed === 0) {
        toast.info('No expired visas found to close.');
      } else {
        toast.success(`✅ Closed ${result.closed} expired visa${result.closed !== 1 ? 's' : ''} successfully!`);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAutoClosing(false);
    }
  };

  // Extract unique suppliers from data
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => {
      const supplier = (s.details as any)?.visa_supplier;
      if (supplier) set.add(supplier);
    });
    return Array.from(set).sort();
  }, [services]);

  // Extract unique categories from data
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [services]);

  // Month date calculations
  const dateInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nextMonthYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return {
      today,
      currentYear,
      currentMonth,
      currentMonthName: monthNames[currentMonth],
      nextMonthYear,
      nextMonth,
      nextMonthName: monthNames[nextMonth],
    };
  }, []);

  // Robust date parser into numeric timestamp
  const parseDateToTimestamp = (dateVal: any): number => {
    if (!dateVal) return 0;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? 0 : dateVal.getTime();

    const str = String(dateVal).trim();
    if (!str) return 0;

    // Handle DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(str)) {
      const parts = str.split(/[\/-]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Helper to extract effective expiry date string (prefers visa_expiry_date, falls back to travel_date + 60 days, then visa_issued_date + 60 days)
  const getExpiryStr = (s: any): string => {
    const details = (s.details as any) || {};

    if (details.visa_expiry_date) {
      return details.visa_expiry_date;
    }

    const baseDateStr = details.travel_date || details.visa_issued_date;
    if (baseDateStr) {
      const baseTs = parseDateToTimestamp(baseDateStr);
      if (baseTs > 0) {
        const expDate = new Date(baseTs);
        expDate.setDate(expDate.getDate() + 60); // 2 months = 60 days
        const yyyy = expDate.getFullYear();
        const mm = String(expDate.getMonth() + 1).padStart(2, '0');
        const dd = String(expDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return baseDateStr;
    }

    return '';
  };

  // Helper to get maximum date timestamp for a visa service to determine which record is newest/latest
  const getServiceLatestTimestamp = (s: any): number => {
    const d = (s.details as any) || {};
    const createdAtTs = parseDateToTimestamp(s.created_at);
    const travelTs = parseDateToTimestamp(d.travel_date);
    const expiryTs = parseDateToTimestamp(d.visa_expiry_date);
    const issueTs = parseDateToTimestamp(d.visa_issued_date);

    return Math.max(createdAtTs, travelTs, expiryTs, issueTs);
  };

  // Helper to compute expiry info for a service
  const getExpiryInfo = (s: any) => {
    const expiryStr = getExpiryStr(s);
    if (!expiryStr) {
      return { expiryStr: '', isExpiringThisMonth: false, isExpiringNextMonth: false, isExpired: false, daysRemaining: null };
    }

    const expTs = parseDateToTimestamp(expiryStr);
    if (expTs === 0) {
      return { expiryStr, isExpiringThisMonth: false, isExpiringNextMonth: false, isExpired: false, daysRemaining: null };
    }

    const expDate = new Date(expTs);
    const { today, currentYear, currentMonth, nextMonthYear, nextMonth } = dateInfo;
    const expYear = expDate.getFullYear();
    const expMonth = expDate.getMonth();

    const isExpiringThisMonth = expYear === currentYear && expMonth === currentMonth;
    const isExpiringNextMonth = expYear === nextMonthYear && expMonth === nextMonth;

    const diffTime = expDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining < 0;

    return {
      expiryStr,
      expDate,
      isExpiringThisMonth,
      isExpiringNextMonth,
      isExpired,
      daysRemaining,
    };
  };

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, supplierFilter, categoryFilter, expiryFilter]);

  // Filter logic
  const filtered = useMemo(() => {
    return services.filter(s => {
      if (s.category === 'Tour Package' || String(s.category).toLowerCase().includes('tour package')) return false;

      const customer = s.customers;
      const details = s.details as any;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matches = [
          customer?.name,
          customer?.passport_no,
          customer?.phone,
          s.reference_id,
          details?.visa_supplier,
          details?.referred_by,
        ].some(v => v && String(v).toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      // Supplier filter
      if (supplierFilter !== 'all' && details?.visa_supplier !== supplierFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;

      // Expiry Period filter
      if (expiryFilter !== 'all') {
        const { isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = getExpiryInfo(s);
        if (expiryFilter === 'this_month' && !isExpiringThisMonth) return false;
        if (expiryFilter === 'next_month' && !isExpiringNextMonth) return false;
        if (expiryFilter === 'expired' && !isExpired) return false;
        if (expiryFilter === 'in_30_days' && (daysRemaining === null || daysRemaining < 0 || daysRemaining > 30)) return false;
      }

      return true;
    });
  }, [services, search, statusFilter, supplierFilter, categoryFilter, expiryFilter, dateInfo]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  // Financial summary
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

  // Smart Expiry Alerts: Group by person (passport / name / customer_id), find latest active visa per person
  const expiryAlertData = useMemo(() => {
    const byPerson = new Map<string, any[]>();
    services.forEach(s => {
      if (s.category === 'Tour Package' || String(s.category).toLowerCase().includes('tour package')) return;

      const cust = s.customers;
      const details = s.details as any;

      const rawPassport = cust?.passport_no || details?.passport_no || '';
      const cleanedPassport = String(rawPassport).replace(/\s+/g, '').toUpperCase();

      const rawName = cust?.name || details?.customer_name || '';
      const cleanedName = String(rawName).trim().toLowerCase().replace(/\s+/g, ' ');

      let key = '';
      if (cleanedPassport && cleanedPassport !== '-' && cleanedPassport !== 'N/A' && cleanedPassport.length >= 3) {
        key = `passport:${cleanedPassport}`;
      } else if (cleanedName && cleanedName !== '-' && cleanedName !== 'n/a') {
        key = `name:${cleanedName}`;
      } else {
        key = `id:${s.customer_id || s.id}`;
      }

      if (!byPerson.has(key)) byPerson.set(key, []);
      byPerson.get(key)!.push(s);
    });

    const allAlerts: { service: any; daysLeft: number; isExpired: boolean; isThisMonth: boolean; isNextMonth: boolean; totalRecords: number }[] = [];

    byPerson.forEach((personServices) => {
      // Find active services (not Closed or Cancelled)
      const activeServices = personServices.filter(s => s.status !== 'Closed' && s.status !== 'Cancelled');
      if (activeServices.length === 0) return;

      // Sort by latest timestamp descending to find the newest visa extension / travel date
      const sorted = activeServices.sort((a, b) => {
        const timeA = getServiceLatestTimestamp(a);
        const timeB = getServiceLatestTimestamp(b);
        if (timeA !== timeB) return timeB - timeA;
        return String(b.created_at || b.id).localeCompare(String(a.created_at || a.id));
      });

      const latest = sorted[0];
      const { isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = getExpiryInfo(latest);

      if (daysRemaining === null) return;

      // Include if expired, expiring this month, expiring next month, or within 60 days
      if (isExpired || isExpiringThisMonth || isExpiringNextMonth || daysRemaining <= 60) {
        allAlerts.push({
          service: latest,
          daysLeft: daysRemaining,
          isExpired,
          isThisMonth: isExpiringThisMonth,
          isNextMonth: isExpiringNextMonth,
          totalRecords: personServices.length,
        });
      }
    });

    // Sort: expired first, then by days left ascending
    allAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

    const thisMonthList = allAlerts.filter(a => a.isThisMonth);
    const nextMonthList = allAlerts.filter(a => a.isNextMonth);
    const expiredList = allAlerts.filter(a => a.isExpired);

    return {
      allAlerts,
      thisMonthList,
      nextMonthList,
      expiredList,
    };
  }, [services, dateInfo]);

  // Tab-filtered alerts for UI display
  const displayedAlerts = useMemo(() => {
    if (expiryTab === 'this_month') return expiryAlertData.thisMonthList;
    if (expiryTab === 'next_month') return expiryAlertData.nextMonthList;
    if (expiryTab === 'expired') return expiryAlertData.expiredList;
    return expiryAlertData.allAlerts;
  }, [expiryTab, expiryAlertData]);

  // Handle Export to Excel (.xlsx) or CSV
  const exportData = (itemsToExport: any[], fileNamePrefix: string, format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!itemsToExport || itemsToExport.length === 0) {
      toast.error('No data to export!');
      return;
    }

    const rows = itemsToExport.map(s => {
      const cust = s.customers;
      const details = s.details as any;
      const fin = s.financials as any;
      const { expiryStr, isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = getExpiryInfo(s);

      let expiryStatus = 'Active';
      if (isExpired) {
        expiryStatus = `EXPIRED (${Math.abs(daysRemaining || 0)} days ago)`;
      } else if (isExpiringThisMonth) {
        expiryStatus = `Expiring This Month (${daysRemaining}d left)`;
      } else if (isExpiringNextMonth) {
        expiryStatus = `Expiring Next Month (${daysRemaining}d left)`;
      } else if (daysRemaining !== null) {
        expiryStatus = `${daysRemaining} days left`;
      }

      const receiving = Number(fin?.receiving_amount || 0);
      const supplierCost = Number(fin?.supplier_cost || 0);
      const profit = receiving - supplierCost;

      return {
        'Ref ID': s.reference_id || '',
        'Customer Name': cust?.name || details?.customer_name || '',
        'Phone Number': cust?.phone || details?.phone || '',
        'Passport Number': cust?.passport_no || details?.passport_no || '',
        'Category / Mode': s.category || '',
        'Visa Supplier': details?.visa_supplier || '',
        'Visa Duration': details?.visa_duration || '',
        'Visa Issued Date': details?.visa_issued_date || '',
        'Travel Date': details?.travel_date || '',
        'Visa Expiry Date': expiryStr || details?.visa_expiry_date || '',
        'Expiry Status': expiryStatus,
        'Status': s.status || '',
        'Amount (AED)': Number(fin?.amount || 0),
        'Receiving Amount (AED)': receiving,
        'Supplier Cost (AED)': supplierCost,
        'Gross Profit (AED)': profit,
        'Payment Method': fin?.payment_method || details?.payment_method || '',
        'Referred By': details?.referred_by || '',
        'Notes': details?.comments || details?.remark || details?.notes || '',
      };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${fileNamePrefix}_${dateStr}`;

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'UAE Visas');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success(`Exported ${rows.length} records to Excel (.xlsx)!`);
    }

    setShowExportMenu(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this visa record?')) return;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 text-[#D97757] opacity-80" />
            UAE Visa Tracker
          </h1>
          <p className="text-sm opacity-60 mt-1 font-mono">{summary.count} records</p>
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
                  onClick={() => exportData(filtered, 'UAE_Visa_Filtered', 'xlsx')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export Filtered List (.xlsx)</span>
                  <span className="font-mono text-[10px] opacity-60">{filtered.length}</span>
                </button>
                <button
                  onClick={() => {
                    const thisMonthItems = services.filter(s => getExpiryInfo(s).isExpiringThisMonth);
                    exportData(thisMonthItems, `UAE_Visa_Expiring_${dateInfo.currentMonthName}`, 'xlsx');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium text-amber-600 dark:text-amber-400"
                >
                  <span>Expiring This Month ({dateInfo.currentMonthName})</span>
                  <span className="font-mono text-[10px] opacity-80">.xlsx</span>
                </button>
                <button
                  onClick={() => {
                    const nextMonthItems = services.filter(s => getExpiryInfo(s).isExpiringNextMonth);
                    exportData(nextMonthItems, `UAE_Visa_Expiring_${dateInfo.nextMonthName}`, 'xlsx');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium text-blue-600 dark:text-blue-400"
                >
                  <span>Expiring Next Month ({dateInfo.nextMonthName})</span>
                  <span className="font-mono text-[10px] opacity-80">.xlsx</span>
                </button>
                <button
                  onClick={() => exportData(services, 'UAE_Visa_All_Records', 'xlsx')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium"
                >
                  <span>Export All Records (.xlsx)</span>
                  <span className="font-mono text-[10px] opacity-60">{services.length}</span>
                </button>
                <div className="border-t border-[var(--card-border)] my-1" />
                <button
                  onClick={() => exportData(filtered, 'UAE_Visa_Filtered', 'csv')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium opacity-80"
                >
                  <span>Export as CSV (.csv)</span>
                  <span className="font-mono text-[10px] opacity-60">CSV</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleAutoClose}
            disabled={autoClosing}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium transition-all hover:bg-[var(--sidebar-bg)] disabled:opacity-50"
            title="Close all visas where expiry date has passed"
          >
            {autoClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 opacity-70" />}
            {autoClosing ? 'Closing...' : 'Auto-Close Expired'}
          </button>

          <Link
            href="/dashboard/uae-visa/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] transition-all hover:opacity-90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Visa Record
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
            <div className={`text-xl font-mono font-bold ${card.color}`}>
              {card.value.toLocaleString()} <span className="text-xs font-normal opacity-60">AED</span>
            </div>
          </div>
        ))}
      </div>

      {/* Smart Expiry Alerts Panel */}
      {expiryAlertData.allAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/50 dark:border-amber-900/30 pb-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
              <span>Smart Expiry Tracker</span>
              <span className="text-xs font-normal opacity-75">({expiryAlertData.allAlerts.length} clients need attention)</span>
            </div>

            {/* Quick Export & Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex p-0.5 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setExpiryTab('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    expiryTab === 'all' ? 'bg-white dark:bg-amber-800 text-amber-900 dark:text-amber-100 shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  All ({expiryAlertData.allAlerts.length})
                </button>
                <button
                  onClick={() => setExpiryTab('this_month')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    expiryTab === 'this_month' ? 'bg-amber-500 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  This Month ({expiryAlertData.thisMonthList.length})
                </button>
                <button
                  onClick={() => setExpiryTab('next_month')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    expiryTab === 'next_month' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  Next Month ({expiryAlertData.nextMonthList.length})
                </button>
                <button
                  onClick={() => setExpiryTab('expired')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    expiryTab === 'expired' ? 'bg-red-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  Expired ({expiryAlertData.expiredList.length})
                </button>
              </div>

              {/* Direct Export Buttons for Expiring Months */}
              <button
                onClick={() => {
                  const items = expiryAlertData.thisMonthList.map(a => a.service);
                  exportData(items, `Expiring_This_Month_${dateInfo.currentMonthName}`, 'xlsx');
                }}
                className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 hover:bg-amber-200 text-xs font-medium flex items-center gap-1 transition-colors"
                title="Export Visas Expiring This Month to Excel"
              >
                <Download className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                This Month (.xlsx)
              </button>
              <button
                onClick={() => {
                  const items = expiryAlertData.nextMonthList.map(a => a.service);
                  exportData(items, `Expiring_Next_Month_${dateInfo.nextMonthName}`, 'xlsx');
                }}
                className="px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100 text-xs font-medium flex items-center gap-1 transition-colors"
                title="Export Visas Expiring Next Month to Excel"
              >
                <Download className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Next Month (.xlsx)
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedAlerts.map(({ service: s, daysLeft, isExpired, isThisMonth, isNextMonth, totalRecords }) => {
              const cust = s.customers;
              const details = s.details as any;
              const phoneNum = cust?.phone || details?.phone;

              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-all ${
                    isExpired
                      ? 'bg-red-100/80 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-950 dark:text-red-100'
                      : isThisMonth
                      ? 'bg-amber-100/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                      : isNextMonth
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm line-clamp-1">{cust?.name || details?.customer_name || 'Unknown Customer'}</div>
                      
                      {/* Customer Contact Info: Passport & Phone */}
                      <div className="text-[11px] opacity-80 font-mono space-y-0.5 mt-0.5">
                        <div>Passport: <span className="font-semibold">{cust?.passport_no || details?.passport_no || '—'}</span></div>
                        {phoneNum && (
                          <div className="flex items-center gap-1 font-sans text-slate-800 dark:text-slate-200 font-medium">
                            <Phone className="w-3 h-3 text-[#D97757]" />
                            <a href={`tel:${phoneNum}`} className="hover:underline text-[#D97757] font-semibold">{phoneNum}</a>
                          </div>
                        )}
                      </div>

                      {totalRecords > 1 && (
                        <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1">
                          {totalRecords} visa extensions on record
                        </div>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        isExpired
                          ? 'bg-red-600 text-white animate-pulse'
                          : isThisMonth
                          ? 'bg-amber-500 text-white'
                          : isNextMonth
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-500 text-white'
                      }`}
                    >
                      {isExpired
                        ? `EXPIRED (${Math.abs(daysLeft)}d ago)`
                        : isThisMonth
                        ? `This Month (${daysLeft}d left)`
                        : isNextMonth
                        ? `Next Month (${daysLeft}d left)`
                        : `${daysLeft}d left`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] border-t border-black/5 dark:border-white/10 pt-2 mt-1">
                    <div className="font-mono">
                      Expiry: <span className="font-bold">{details?.visa_expiry_date || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/uae-visa/new?customerId=${cust?.id || s.customer_id || ''}`}
                        className="px-2.5 py-1 rounded-md bg-[#D97757] text-white hover:bg-[#c26243] font-semibold transition-colors flex items-center gap-1 text-[11px] shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Extend
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedAlerts.length === 0 && (
              <div className="col-span-full py-8 text-center opacity-60 text-xs font-serif">
                No visa expiry alerts found for the selected tab.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Odoo Control Panel & Search Bar */}
      <div className="card-anthropic p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, passport, phone, ref ID, supplier..."
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Odoo View Mode Toggles & Action Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* View Mode Switcher */}
            <div className="inline-flex p-1 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-[var(--card-bg)] text-[#D97757] shadow-xs'
                    : 'opacity-65 hover:opacity-100'
                }`}
                title="List / Tree View"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-[#D97757] text-white shadow-xs'
                    : 'opacity-65 hover:opacity-100'
                }`}
                title="Kanban Pipeline View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                showFilters || statusFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all' || expiryFilter !== 'all'
                  ? 'border-[#D97757] text-[#D97757] bg-[#D97757]/5'
                  : 'border-[var(--card-border)] hover:bg-[var(--sidebar-bg)]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {(statusFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all' || expiryFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-[#D97757]" />
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-[var(--card-border)]">
            <div>
              <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block font-semibold">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[#D97757]"
              >
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refund Pending">Refund Pending</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block font-semibold">Expiry Period</label>
              <select
                value={expiryFilter}
                onChange={e => setExpiryFilter(e.target.value as any)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[#D97757]"
              >
                <option value="all">All Expiry Dates</option>
                <option value="this_month">Expiring This Month ({dateInfo.currentMonthName})</option>
                <option value="next_month">Expiring Next Month ({dateInfo.nextMonthName})</option>
                <option value="expired">Expired Visas</option>
                <option value="in_30_days">Expiring within 30 Days</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block font-semibold">Supplier</label>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[#D97757]"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider opacity-60 mb-1 block font-semibold">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:border-[#D97757]"
              >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-1">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSupplierFilter('all');
                  setCategoryFilter('all');
                  setExpiryFilter('all');
                }}
                className="text-xs text-[#D97757] hover:underline font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Kanban View vs. List View */}
      {viewMode === 'kanban' ? (
        <OdooKanbanView
          services={filtered}
          onSelectService={s => {
            setSelectedService(s);
            setIsDrawerOpen(true);
          }}
          onQuickStatusChange={async (id, nextStatus) => {
            setServices(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus } : s));
            toast.loading(`Updating status to ${nextStatus}...`, { id: 'kanban-status' });
            const res = await quickUpdateService(id, { status: nextStatus });
            if (res.success && res.service) {
              setServices(prev => prev.map(s => s.id === id ? res.service : s));
              toast.success(`Updated status to ${nextStatus}!`, { id: 'kanban-status' });
            } else {
              toast.error(res.error || 'Failed to update status', { id: 'kanban-status' });
            }
          }}
          getExpiryInfo={getExpiryInfo}
        />
      ) : (
        /* List / Tree View */
        <div className="card-anthropic overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-[10px] uppercase tracking-wider opacity-70">
                <tr>
                  <th className="px-4 py-3 font-medium">Ref ID</th>
                  <th className="px-4 py-3 font-medium">Customer / Phone</th>
                  <th className="px-4 py-3 font-medium">Mode / Category</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Visa Expiry</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Receiving</th>
                  <th className="px-4 py-3 font-medium text-right">Supplier Cost</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {paginatedItems.map(service => {
                  const customer = service.customers;
                  const details = service.details as any;
                  const fin = service.financials as any;
                  const { expiryStr, isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = getExpiryInfo(service);
                  const phoneNum = customer?.phone || details?.phone;

                  return (
                    <tr
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setIsDrawerOpen(true);
                      }}
                      className={`hover:bg-[var(--sidebar-bg)] cursor-pointer transition-colors group ${
                        isExpiringThisMonth 
                          ? (daysRemaining !== null && daysRemaining <= 7 ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-amber-500/5 hover:bg-amber-500/10') 
                          : isExpiringNextMonth
                          ? 'bg-blue-500/5 hover:bg-blue-500/10'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#D97757] font-bold hover:underline">
                          {service.reference_id || '—'}
                        </span>
                      </td>
                      
                      {/* Customer & Phone Details */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#D97757] transition-colors">
                            {customer?.name || details?.customer_name || '—'}
                          </div>
                          <div className="text-[11px] opacity-70 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span>Pass: {customer?.passport_no || details?.passport_no || '—'}</span>
                            {phoneNum && (
                              <>
                                <span className="opacity-30">•</span>
                                <span className="text-[#D97757] font-sans font-semibold flex items-center gap-0.5">
                                  <Phone className="w-2.5 h-2.5" />
                                  {phoneNum}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs font-medium">{service.category}</td>
                      <td className="px-4 py-3 text-xs">{details?.visa_supplier || '—'}</td>
                      <td className="px-4 py-3 text-xs">{details?.visa_duration || '—'}</td>
                      
                      {/* Expiry Column */}
                      <td className="px-4 py-3 text-xs">
                        {expiryStr ? (
                          <div className="flex flex-col gap-0.5">
                            <div className={`font-mono text-xs font-semibold ${
                              isExpired
                                ? 'text-red-600 dark:text-red-400'
                                : isExpiringThisMonth 
                                ? 'text-amber-600 dark:text-amber-500' 
                                : isExpiringNextMonth
                                ? 'text-blue-600 dark:text-blue-400'
                                : ''
                            }`}>
                              {expiryStr}
                            </div>
                            {(isExpiringThisMonth || isExpiringNextMonth || isExpired) && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider font-mono w-max ${
                                isExpired
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 animate-pulse'
                                  : isExpiringThisMonth 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' 
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                              }`}>
                                {isExpired
                                  ? 'Expired'
                                  : isExpiringThisMonth
                                  ? `This Month (${daysRemaining}d)`
                                  : `Next Month (${daysRemaining}d)`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-xs">{Number(fin?.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-blue-600">{Number(fin?.receiving_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-amber-600">{Number(fin?.supplier_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs capitalize">{fin?.payment_method || details?.payment_method || '—'}</td>
                      
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={service.status}
                          onChange={async (e) => {
                            const nextStatus = e.target.value;
                            setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: nextStatus } : s));
                            const res = await quickUpdateService(service.id, { status: nextStatus });
                            if (res.success && res.service) {
                              setServices(prev => prev.map(s => s.id === service.id ? res.service : s));
                              toast.success('Status updated successfully!');
                            } else {
                              toast.error(res.error || 'Failed to update status');
                            }
                          }}
                          className={`inline-block px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border border-transparent hover:border-[var(--card-border)] bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D97757]/40 ${STATUS_COLORS[service.status] || 'bg-gray-100 text-gray-600'}`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refund Pending">Refund Pending</option>
                        </select>
                      </td>
                      
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Quick Edit Drawer Trigger */}
                          <button
                            onClick={() => {
                              setSelectedService(service);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-[var(--card-border)] text-[#D97757] transition-colors"
                            title="Quick Edit Drawer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Extend Quick Action */}
                          <Link
                            href={`/dashboard/uae-visa/new?customerId=${service.customer_id}`}
                            className="p-1.5 rounded hover:bg-[var(--card-border)] text-blue-600 hover:text-blue-700 transition-colors"
                            title="Extend Visa"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </Link>

                          {/* Clear Quick Action */}
                          {service.status !== 'Closed' && service.status !== 'Cancelled' && (
                            <button
                              onClick={async () => {
                                if (confirm('Clear/Close this active visa record?')) {
                                  setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: 'Closed' } : s));
                                  const res = await quickUpdateService(service.id, { status: 'Closed' });
                                  if (res.success) {
                                    toast.success('Visa record cleared/closed!');
                                  } else {
                                    toast.error(res.error || 'Failed to clear visa');
                                  }
                                }
                              }}
                              className="p-1.5 rounded hover:bg-[var(--card-border)] text-green-600 hover:text-green-700 transition-colors"
                              title="Clear/Close Visa"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Link
                            href={`/dashboard/uae-visa/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`}
                            className="p-1.5 rounded hover:bg-[var(--card-border)] transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleDelete(service.id)}
                            disabled={deletingId === service.id}
                            className="p-1.5 rounded hover:bg-[var(--card-border)] hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            {deletingId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <Shield className="w-10 h-10 opacity-20" />
                        <p className="opacity-50 font-serif">No visa records found.</p>
                        <Link href="/dashboard/uae-visa/new" className="text-[#D97757] text-sm font-medium hover:underline">
                          Add your first record
                        </Link>
                      </div>
                    </td>
                  </tr>
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
      )}

      {/* Odoo Quick Edit Side Drawer */}
      <OdooQuickEditDrawer
        service={selectedService}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={updatedService => {
          setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
          setSelectedService(updatedService);
        }}
        onDelete={serviceId => {
          setServices(prev => prev.filter(s => s.id !== serviceId));
          setIsDrawerOpen(false);
        }}
        suppliersList={suppliers}
        categoriesList={categories}
      />
    </div>
  );
}

