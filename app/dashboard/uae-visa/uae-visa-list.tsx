'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Filter, ChevronDown, Shield, X, Eye, Trash2, Loader2, PlusCircle, CheckCircle, AlertTriangle, Download, Phone, Calendar, FileSpreadsheet, Copy, LayoutGrid, List, Layers, Edit3, Pencil, Check, MessageCircle, SlidersHorizontal, Command } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomerService, quickUpdateService, updateServiceRefId } from '@/app/actions/services';
import { autoCloseExpiredVisas } from '@/app/actions/auto-close-visas';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { STATUS_COLORS } from '@/lib/statusColors';
import Pagination from '@/components/Pagination';
import OdooQuickEditDrawer from '@/components/OdooQuickEditDrawer';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import OdooKanbanView from '@/components/OdooKanbanView';
import { UserProfile, checkPermission } from '@/lib/auth-permissions';

interface Props {
  initialServices: any[];
  customers: any[];
  profile?: UserProfile | null;
}

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

  // Odoo Specific View Modes & Quick Edit Drawer State
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'supplier' | 'category'>('none');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ref: string; name: string } | null>(null);
  const [autoClosing, setAutoClosing] = useState(false);

  // Desktop App Density & Smart Expiry Banner State
  const [density, setDensity] = useState<'compact' | 'normal'>('compact');
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load density preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('uae_visa_density');
      if (saved === 'compact' || saved === 'normal') {
        setDensity(saved);
      }
    } catch {}
  }, []);

  const toggleDensity = () => {
    setDensity(prev => {
      const next = prev === 'compact' ? 'normal' : 'compact';
      try {
        localStorage.setItem('uae_visa_density', next);
      } catch {}
      return next;
    });
  };

  // WhatsApp reminder message builder
  const getWhatsAppUrl = (phoneVal: string, nameVal: string, refVal: string, expiryVal: string) => {
    if (!phoneVal) return null;
    const clean = String(phoneVal).replace(/[^0-9]/g, '');
    if (!clean) return null;
    const text = `Hello ${nameVal || 'Customer'},\nRegarding your UAE Visit Visa (Ref: ${refVal || ''}, Expiry: ${expiryVal || 'N/A'}). Please let us know if you need to extend or renew.\nBest regards,\nNextStep Travel`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  // Keyboard Shortcuts (/ for search, d for density, Escape for reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'SELECT';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'd' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleDensity();
      } else if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        else if (search) setSearch('');
        else if (statusFilter !== 'all' || expiryFilter !== 'all' || supplierFilter !== 'all') {
          setStatusFilter('all');
          setExpiryFilter('all');
          setSupplierFilter('all');
          setCategoryFilter('all');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, search, statusFilter, expiryFilter, supplierFilter]);

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
          details?.handled_by,
          details?.referred_by,
          ...(details?.passengers || []).map((p: any) => p.name),
          ...(details?.passengers || []).map((p: any) => p.passport_no),
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

  // Status counts for quick segment tabs
  const statusCounts = useMemo(() => {
    let open = 0, inProgress = 0, closed = 0, cancelled = 0, refund = 0;
    services.forEach(s => {
      if (s.category === 'Tour Package' || String(s.category).toLowerCase().includes('tour package')) return;
      if (s.status === 'Open') open++;
      else if (s.status === 'In Progress') inProgress++;
      else if (s.status === 'Closed') closed++;
      else if (s.status === 'Cancelled') cancelled++;
      else if (s.status === 'Refund Pending') refund++;
    });
    const nonTourCount = services.filter(s => s.category !== 'Tour Package' && !String(s.category).toLowerCase().includes('tour package')).length;
    return {
      all: nonTourCount,
      open,
      inProgress,
      closed,
      cancelled,
      refund,
    };
  }, [services]);

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
        'Handled By': details?.handled_by || '',
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    const res = await deleteCustomerService(deleteTarget.id);
    if (res.success) {
      setServices(services.filter(s => s.id !== deleteTarget.id));
      toast.success('Visa record deleted');
    } else {
      toast.error(res.error || 'Failed to delete record');
    }
    setDeletingId(null);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-3.5 pb-16">
      {/* App Command Bar (Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--card-border)] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
                UAE Visa Tracker
              </h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--sidebar-bg)] border border-[var(--card-border)] opacity-75">
                {summary.count} records
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Table Density Switcher */}
          <button
            onClick={toggleDensity}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--sidebar-bg)] transition-all shadow-xs cursor-pointer"
            title="Toggle Density: Compact / Normal (Hotkey: D)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#D97757]" />
            <span>{density === 'compact' ? 'Compact' : 'Normal'}</span>
            <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--card-border)] opacity-60">D</kbd>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--sidebar-bg)] transition-all shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-1.5 shadow-xl z-50 text-xs">
                <div className="px-3 py-1.5 font-semibold text-[10px] uppercase tracking-wider opacity-50 border-b border-[var(--card-border)] mb-1">
                  Export Options
                </div>
                <button
                  onClick={() => exportData(filtered, 'UAE_Visa_Filtered', 'xlsx')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium cursor-pointer"
                >
                  <span>Export Filtered List</span>
                  <span className="font-mono text-[10px] opacity-60">.xlsx</span>
                </button>
                <button
                  onClick={() => {
                    const thisMonthItems = services.filter(s => getExpiryInfo(s).isExpiringThisMonth);
                    exportData(thisMonthItems, `UAE_Visa_Expiring_${dateInfo.currentMonthName}`, 'xlsx');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium text-amber-600 dark:text-amber-400 cursor-pointer"
                >
                  <span>Expiring This Month</span>
                  <span className="font-mono text-[10px] opacity-80">.xlsx</span>
                </button>
                <button
                  onClick={() => {
                    const nextMonthItems = services.filter(s => getExpiryInfo(s).isExpiringNextMonth);
                    exportData(nextMonthItems, `UAE_Visa_Expiring_${dateInfo.nextMonthName}`, 'xlsx');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  <span>Expiring Next Month</span>
                  <span className="font-mono text-[10px] opacity-80">.xlsx</span>
                </button>
                <button
                  onClick={() => exportData(services, 'UAE_Visa_All_Records', 'xlsx')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium cursor-pointer"
                >
                  <span>Export All Records</span>
                  <span className="font-mono text-[10px] opacity-60">.xlsx</span>
                </button>
                <div className="border-t border-[var(--card-border)] my-1" />
                <button
                  onClick={() => exportData(filtered, 'UAE_Visa_Filtered', 'csv')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] flex items-center justify-between font-medium opacity-80 cursor-pointer"
                >
                  <span>Export as CSV</span>
                  <span className="font-mono text-[10px] opacity-60">.csv</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleAutoClose}
            disabled={autoClosing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium transition-all hover:bg-[var(--sidebar-bg)] disabled:opacity-50 cursor-pointer"
            title="Close all visas where expiry date has passed"
          >
            {autoClosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
            <span>Auto-Close</span>
          </button>

          <Link
            href="/dashboard/uae-visa/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97757] px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Visa</span>
          </Link>
        </div>
      </div>

      {/* Compact Metric Ribbon (Replaces 4 large KPI cards to save ~120px) */}
      <div className="card-anthropic px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap divide-x divide-[var(--card-border)]">
          <div className="flex items-center gap-1.5">
            <span className="opacity-50 uppercase tracking-wider font-semibold text-[10px]">Total:</span>
            <span className="font-mono font-bold text-sm">{summary.totalAmount.toLocaleString()} <span className="text-[10px] font-normal opacity-60">AED</span></span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 sm:pl-4">
            <span className="opacity-50 uppercase tracking-wider font-semibold text-[10px]">Receiving:</span>
            <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{summary.totalReceiving.toLocaleString()} <span className="text-[10px] font-normal opacity-60">AED</span></span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 sm:pl-4">
            <span className="opacity-50 uppercase tracking-wider font-semibold text-[10px]">Supplier Cost:</span>
            <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">{summary.totalSupplierCost.toLocaleString()} <span className="text-[10px] font-normal opacity-60">AED</span></span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 sm:pl-4">
            <span className="opacity-50 uppercase tracking-wider font-semibold text-[10px]">Gross Profit:</span>
            <span className={`font-mono font-bold text-sm ${summary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {summary.totalProfit >= 0 ? `+${summary.totalProfit.toLocaleString()}` : summary.totalProfit.toLocaleString()} <span className="text-[10px] font-normal opacity-60">AED</span>
            </span>
          </div>
        </div>

        {/* 1-Click Status Filter Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {expiryAlertData.expiredList.length > 0 && (
            <button
              onClick={() => {
                setExpiryFilter(expiryFilter === 'expired' ? 'all' : 'expired');
                setStatusFilter('all');
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                expiryFilter === 'expired'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
              }`}
              title="Click to view Expired Visas in table"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span>{expiryAlertData.expiredList.length} Expired</span>
            </button>
          )}
          {expiryAlertData.thisMonthList.length > 0 && (
            <button
              onClick={() => {
                setExpiryFilter(expiryFilter === 'this_month' ? 'all' : 'this_month');
                setStatusFilter('all');
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                expiryFilter === 'this_month'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Click to view Visas expiring this month in table"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{expiryAlertData.thisMonthList.length} This Month</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Smart Expiry Ticker Banner (Saves ~280px vertical space) */}
      {expiryAlertData.allAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <span>
                Smart Expiry Tracker: <strong className="font-mono text-amber-700 dark:text-amber-400">{expiryAlertData.allAlerts.length}</strong> clients need attention
              </span>
              <span className="opacity-60 font-normal hidden md:inline">
                ({expiryAlertData.thisMonthList.length} this month, {expiryAlertData.nextMonthList.length} next month, {expiryAlertData.expiredList.length} expired)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setExpiryFilter(expiryFilter === 'in_30_days' ? 'all' : 'in_30_days');
                  setStatusFilter('all');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  expiryFilter === 'in_30_days'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 hover:bg-amber-300/60'
                }`}
              >
                {expiryFilter === 'in_30_days' ? 'Showing Expiring ✕' : 'Filter in Table'}
              </button>

              <button
                onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
                className="px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{isAlertsExpanded ? 'Hide Cards' : 'View Cards'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAlertsExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Expandable Cards Grid */}
          {isAlertsExpanded && (
            <div className="pt-3 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
              {/* Quick Export & Filter Tabs inside expanded cards */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="inline-flex p-0.5 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setExpiryTab('all')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      expiryTab === 'all' ? 'bg-white dark:bg-amber-800 text-amber-900 dark:text-amber-100 shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    All ({expiryAlertData.allAlerts.length})
                  </button>
                  <button
                    onClick={() => setExpiryTab('this_month')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      expiryTab === 'this_month' ? 'bg-amber-500 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    This Month ({expiryAlertData.thisMonthList.length})
                  </button>
                  <button
                    onClick={() => setExpiryTab('next_month')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      expiryTab === 'next_month' ? 'bg-blue-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    Next Month ({expiryAlertData.nextMonthList.length})
                  </button>
                  <button
                    onClick={() => setExpiryTab('expired')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      expiryTab === 'expired' ? 'bg-red-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    Expired ({expiryAlertData.expiredList.length})
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const items = expiryAlertData.thisMonthList.map(a => a.service);
                      exportData(items, `Expiring_This_Month_${dateInfo.currentMonthName}`, 'xlsx');
                    }}
                    className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-amber-700" />
                    This Month (.xlsx)
                  </button>
                  <button
                    onClick={() => {
                      const items = expiryAlertData.nextMonthList.map(a => a.service);
                      exportData(items, `Expiring_Next_Month_${dateInfo.nextMonthName}`, 'xlsx');
                    }}
                    className="px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-blue-600" />
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
                          
                          <div className="text-[11px] opacity-80 font-mono space-y-0.5 mt-0.5">
                            <div>Passport: <span className="font-semibold">{cust?.passport_no || details?.passport_no || '—'}</span></div>
                            {phoneNum && (
                              <div className="flex items-center gap-1.5 font-sans text-slate-800 dark:text-slate-200 font-medium">
                                <Phone className="w-3 h-3 text-[#D97757]" />
                                <a href={`tel:${phoneNum}`} className="hover:underline text-[#D97757] font-semibold">{phoneNum}</a>
                                {getWhatsAppUrl(phoneNum, cust?.name || details?.customer_name, s.reference_id, details?.visa_expiry_date) && (
                                  <a
                                    href={getWhatsAppUrl(phoneNum, cust?.name || details?.customer_name, s.reference_id, details?.visa_expiry_date)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-0.5 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors"
                                    title="WhatsApp client"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
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
                  <div className="col-span-full py-6 text-center opacity-60 text-xs font-serif">
                    No visa expiry alerts found for the selected tab.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Odoo Control Panel & Search Bar */}
      <div className="card-anthropic p-3.5 space-y-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-between">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, passport, phone, ref ID, supplier... (Press / to focus)"
              className="w-full pl-9 pr-14 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {search && (
                <button onClick={() => setSearch('')} className="opacity-40 hover:opacity-80 p-0.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-block text-[10px] font-mono px-1 rounded bg-[var(--sidebar-bg)] border border-[var(--card-border)] opacity-50">
                /
              </kbd>
            </div>
          </div>

          {/* Odoo View Mode Toggles & Action Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* View Mode Switcher */}
            <div className="inline-flex p-0.5 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                showFilters || statusFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all' || expiryFilter !== 'all'
                  ? 'border-[#D97757] text-[#D97757] bg-[#D97757]/5'
                  : 'border-[var(--card-border)] hover:bg-[var(--sidebar-bg)]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(statusFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all' || expiryFilter !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Status Segment Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-[var(--card-border)] text-xs">
          {[
            { id: 'all', label: 'All Visas', count: statusCounts.all },
            { id: 'Open', label: 'Open', count: statusCounts.open },
            { id: 'In Progress', label: 'In Progress', count: statusCounts.inProgress },
            { id: 'expiring_soon', label: 'Expiring Soon', count: expiryAlertData.thisMonthList.length + expiryAlertData.nextMonthList.length },
            { id: 'expired_active', label: 'Expired', count: expiryAlertData.expiredList.length },
            { id: 'Closed', label: 'Closed', count: statusCounts.closed },
          ].map(tab => {
            const isSelected = (
              (tab.id === 'all' && statusFilter === 'all' && expiryFilter === 'all') ||
              (tab.id === 'expiring_soon' && (expiryFilter === 'this_month' || expiryFilter === 'in_30_days')) ||
              (tab.id === 'expired_active' && expiryFilter === 'expired') ||
              (statusFilter === tab.id && expiryFilter === 'all')
            );

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'all') {
                    setStatusFilter('all');
                    setExpiryFilter('all');
                  } else if (tab.id === 'expiring_soon') {
                    setStatusFilter('all');
                    setExpiryFilter('in_30_days');
                  } else if (tab.id === 'expired_active') {
                    setStatusFilter('all');
                    setExpiryFilter('expired');
                  } else {
                    setStatusFilter(tab.id);
                    setExpiryFilter('all');
                  }
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#D97757] text-white shadow-xs font-semibold'
                    : 'bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)] opacity-80 hover:opacity-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-[var(--background)] opacity-70'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          {(statusFilter !== 'all' || expiryFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setExpiryFilter('all');
                setSupplierFilter('all');
                setCategoryFilter('all');
                setSearch('');
              }}
              className="ml-auto text-[11px] text-[#D97757] hover:underline shrink-0 font-medium px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
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
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] relative">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] backdrop-blur-md uppercase tracking-wider opacity-90 shadow-xs">
                <tr>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Ref ID</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Customer / Phone</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Mode / Category</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Supplier</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Duration</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Visa Expiry</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold text-right`}>Amount</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold text-right`}>Receiving</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold text-right`}>Supplier Cost</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Payment</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold`}>Status</th>
                  <th className={`${density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'} font-semibold text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {paginatedItems.map(service => {
                  const customer = service.customers;
                  const details = service.details as any;
                  const fin = service.financials as any;
                  const { expiryStr, isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = getExpiryInfo(service);
                  const phoneNum = customer?.phone || details?.phone;
                  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-2.5';

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
                      <td 
                        className={cellPad}
                        onClick={(e) => {
                          if (canEdit) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {editingRefId?.id === service.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
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
                            <span className="font-mono text-xs text-[#D97757] font-bold group-hover/ref:underline">
                              {service.reference_id || '—'}
                            </span>
                            {canEdit && (
                              <Pencil className="w-3 h-3 opacity-0 group-hover/ref:opacity-70 text-[#D97757] transition-opacity" />
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* Customer & Phone Details */}
                      <td className={cellPad}>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#D97757] transition-colors flex items-center gap-1.5">
                            <span className={density === 'compact' ? 'text-xs' : 'text-sm'}>{customer?.name || details?.customer_name || '—'}</span>
                            {details?.passengers && details.passengers.length > 1 && (
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#D97757]/15 text-[#D97757] font-semibold font-mono cursor-help shrink-0"
                                title={`Travelers (${details.passengers.length}):\n${details.passengers.map((p: any, i: number) => `${i + 1}. ${p.name || 'Pax'} (${p.passport_no || 'No Pass'})`).join('\n')}`}
                              >
                                {details.passengers.length} Pax
                              </span>
                            )}
                          </div>
                          {details?.passengers && details.passengers.length > 1 && density === 'normal' && (
                            <div className="text-[11px] text-[#D97757] opacity-90 truncate max-w-[260px] font-sans mt-0.5" title={details.passengers.map((p: any) => p.name).filter(Boolean).join(', ')}>
                              Travelers: {details.passengers.map((p: any) => p.name).filter(Boolean).join(', ')}
                            </div>
                          )}
                          <div className="text-[11px] opacity-70 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span>Pass: {customer?.passport_no || details?.passport_no || '—'}</span>
                            {phoneNum && (
                              <>
                                <span className="opacity-30">•</span>
                                <span className="text-[#D97757] font-sans font-semibold flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />
                                  {phoneNum}
                                </span>
                                {getWhatsAppUrl(phoneNum, customer?.name || details?.customer_name, service.reference_id, expiryStr) && (
                                  <a
                                    href={getWhatsAppUrl(phoneNum, customer?.name || details?.customer_name, service.reference_id, expiryStr)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="p-0.5 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors inline-flex items-center"
                                    title="Send WhatsApp reminder"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                  </a>
                                )}
                              </>
                            )}
                            {details?.handled_by && (
                              <>
                                <span className="opacity-30">•</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium">
                                  By: {details.handled_by}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className={`${cellPad} ${density === 'compact' ? 'text-xs' : 'text-sm'} font-medium`}>{service.category}</td>
                      <td className={`${cellPad} ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>{details?.visa_supplier || '—'}</td>
                      <td className={`${cellPad} ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>{details?.visa_duration || '—'}</td>
                      
                      {/* Expiry Column */}
                      <td className={`${cellPad} ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>
                        {expiryStr ? (
                          <div className="flex flex-col gap-0.5">
                            <div className={`font-mono font-semibold ${density === 'compact' ? 'text-xs' : 'text-sm'} ${
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
                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider font-mono w-max ${
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

                      <td className={`${cellPad} text-right font-mono ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>{Number(fin?.amount || 0).toLocaleString()}</td>
                      <td className={`${cellPad} text-right font-mono ${density === 'compact' ? 'text-xs' : 'text-sm'} font-semibold text-blue-600`}>{Number(fin?.receiving_amount || 0).toLocaleString()}</td>
                      <td className={`${cellPad} text-right font-mono ${density === 'compact' ? 'text-xs' : 'text-sm'} text-amber-600`}>{Number(fin?.supplier_cost || 0).toLocaleString()}</td>
                      <td className={`${cellPad} ${density === 'compact' ? 'text-xs' : 'text-sm'} capitalize`}>{fin?.payment_method || details?.payment_method || '—'}</td>
                      
                      <td className={cellPad} onClick={e => e.stopPropagation()}>
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
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border border-transparent hover:border-[var(--card-border)] bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D97757]/40 ${STATUS_COLORS[service.status] || 'bg-gray-100 text-gray-600'}`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refund Pending">Refund Pending</option>
                        </select>
                      </td>
                      
                      <td className={`${cellPad} text-right`} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Quick Edit Drawer Trigger */}
                          <button
                            onClick={() => {
                              setSelectedService(service);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1 rounded hover:bg-[var(--card-border)] text-[#D97757] transition-colors cursor-pointer"
                            title="Quick Edit Drawer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Extend Quick Action */}
                          <Link
                            href={`/dashboard/uae-visa/new?customerId=${service.customer_id}`}
                            className="p-1 rounded hover:bg-[var(--card-border)] text-blue-600 hover:text-blue-700 transition-colors"
                            title="Extend Visa"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </Link>

                          {/* Clear Quick Action */}
                          {canEdit && service.status !== 'Closed' && service.status !== 'Cancelled' && (
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
                              className="p-1 rounded hover:bg-[var(--card-border)] text-green-600 hover:text-green-700 transition-colors cursor-pointer"
                              title="Clear/Close Visa"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Link
                            href={`/dashboard/uae-visa/new?duplicate=${service.id}&customerId=${service.customer_id || ''}`}
                            className="p-1 rounded hover:bg-[var(--card-border)] transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Link>

                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget({
                                id: service.id,
                                ref: service.reference_id,
                                name: customer?.name || (details as any)?.customer_name || 'Visa Record'
                              })}
                              disabled={deletingId === service.id}
                              className="p-1 rounded hover:bg-[var(--card-border)] hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              {deletingId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
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
        canDelete={canDelete}
        suppliersList={suppliers}
        categoriesList={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Visa Record"
        itemType="visa record"
        itemName={deleteTarget ? `${deleteTarget.ref} (${deleteTarget.name})` : ''}
        isDeleting={!!deletingId}
        description="Are you sure you want to delete this visa record? This action cannot be undone."
      />
    </div>
  );
}

