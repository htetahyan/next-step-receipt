import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { parseServiceDateToTimestamp } from '@/lib/serviceDates';

export const UAE_VISA_LIST_FILTER = {
  notInCategories: [
    'Air Ticket', 'Dummy Ticket', 'Ticket + Hotel Package', 'Flight Booking',
    'Schengen / EU Visa', 'Japan Visa', 'China Visa', 'Korea Visa',
    'Armenia Visa', 'UK Visa', 'Other Country Visa', 'Consultation Only',
    'Tour Package',
  ],
};

export type ExpiryFilter = 'all' | 'this_month' | 'next_month' | 'expired' | 'in_30_days';

export type DateInfo = {
  today: Date;
  currentYear: number;
  currentMonth: number;
  currentMonthName: string;
  nextMonthYear: number;
  nextMonth: number;
  nextMonthName: string;
};

export type ExpiryInfo = {
  expiryStr: string;
  expDate?: Date;
  isExpiringThisMonth: boolean;
  isExpiringNextMonth: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
};

export type ExpiryAlert = {
  service: any;
  daysLeft: number;
  isExpired: boolean;
  isThisMonth: boolean;
  isNextMonth: boolean;
  totalRecords: number;
};

export function getVisaDateInfo(): DateInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return {
    today,
    currentYear,
    currentMonth,
    currentMonthName: monthNames[currentMonth],
    nextMonthYear: nextMonthDate.getFullYear(),
    nextMonth: nextMonthDate.getMonth(),
    nextMonthName: monthNames[nextMonthDate.getMonth()],
  };
}

export function getExpiryStr(service: any): string {
  const details = service?.details || {};
  if (details.visa_expiry_date) return details.visa_expiry_date;
  const baseDateStr = details.travel_date || details.visa_issued_date;
  if (!baseDateStr) return '';
  const baseTs = parseServiceDateToTimestamp(baseDateStr);
  if (baseTs <= 0) return String(baseDateStr);
  const expDate = new Date(baseTs);
  expDate.setDate(expDate.getDate() + 60);
  const yyyy = expDate.getFullYear();
  const mm = String(expDate.getMonth() + 1).padStart(2, '0');
  const dd = String(expDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getExpiryInfo(service: any, dateInfo: DateInfo): ExpiryInfo {
  const empty: ExpiryInfo = {
    expiryStr: '',
    isExpiringThisMonth: false,
    isExpiringNextMonth: false,
    isExpired: false,
    daysRemaining: null,
  };
  const expiryStr = getExpiryStr(service);
  if (!expiryStr) return empty;
  const expTs = parseServiceDateToTimestamp(expiryStr);
  if (expTs === 0) return { ...empty, expiryStr };
  const expDate = new Date(expTs);
  const isExpiringThisMonth = expDate.getFullYear() === dateInfo.currentYear && expDate.getMonth() === dateInfo.currentMonth;
  const isExpiringNextMonth = expDate.getFullYear() === dateInfo.nextMonthYear && expDate.getMonth() === dateInfo.nextMonth;
  const daysRemaining = Math.ceil((expDate.getTime() - dateInfo.today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    expiryStr,
    expDate,
    isExpiringThisMonth,
    isExpiringNextMonth,
    isExpired: daysRemaining < 0,
    daysRemaining,
  };
}

export function getServiceLatestTimestamp(service: any): number {
  const d = service?.details || {};
  return Math.max(
    parseServiceDateToTimestamp(service?.created_at),
    parseServiceDateToTimestamp(d.travel_date),
    parseServiceDateToTimestamp(d.visa_expiry_date),
    parseServiceDateToTimestamp(d.visa_issued_date)
  );
}

export function filterAndSortVisas(
  visas: any[],
  opts: {
    search: string;
    statusFilter: string;
    supplierFilter: string;
    categoryFilter: string;
    expiryFilter: ExpiryFilter;
    dateInfo: DateInfo;
  }
) {
  const q = opts.search.trim().toLowerCase();
  const rows = visas.filter((s) => {
    const customer = s.customers;
    const details = s.details || {};
    if (q) {
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
      ].some((v) => v && String(v).toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (opts.statusFilter !== 'all' && s.status !== opts.statusFilter) return false;
    if (opts.supplierFilter !== 'all' && details?.visa_supplier !== opts.supplierFilter) return false;
    if (opts.categoryFilter !== 'all' && s.category !== opts.categoryFilter) return false;
    if (opts.expiryFilter !== 'all') {
      const info = getExpiryInfo(s, opts.dateInfo);
      if (opts.expiryFilter === 'this_month' && !info.isExpiringThisMonth) return false;
      if (opts.expiryFilter === 'next_month' && !info.isExpiringNextMonth) return false;
      if (opts.expiryFilter === 'expired' && !info.isExpired) return false;
      if (opts.expiryFilter === 'in_30_days' && (info.daysRemaining === null || info.daysRemaining < 0 || info.daysRemaining > 30)) return false;
    }
    return true;
  });

  rows.sort((a, b) => {
    const ea = getExpiryInfo(a, opts.dateInfo);
    const eb = getExpiryInfo(b, opts.dateInfo);
    const aClosed = a.status === 'Closed' || a.status === 'Cancelled';
    const bClosed = b.status === 'Closed' || b.status === 'Cancelled';
    const aExpiredOpen = !!ea.isExpired && !aClosed;
    const bExpiredOpen = !!eb.isExpired && !bClosed;
    if (aExpiredOpen !== bExpiredOpen) return aExpiredOpen ? -1 : 1;
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    const ta = ea.expDate ? ea.expDate.getTime() : Number.POSITIVE_INFINITY;
    const tb = eb.expDate ? eb.expDate.getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return rows;
}

export function buildExpiryAlerts(visas: any[], dateInfo: DateInfo) {
  const byPerson = new Map<string, any[]>();
  visas.forEach((s) => {
    const cust = s.customers;
    const details = s.details || {};
    const passport = String(cust?.passport_no || details?.passport_no || '').replace(/\s+/g, '').toUpperCase();
    const name = String(cust?.name || details?.customer_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    let key = `id:${s.customer_id || s.id}`;
    if (passport && passport !== '-' && passport !== 'N/A' && passport.length >= 3) key = `passport:${passport}`;
    else if (name && name !== '-' && name !== 'n/a') key = `name:${name}`;
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key)!.push(s);
  });

  const allAlerts: ExpiryAlert[] = [];
  byPerson.forEach((personServices) => {
    const active = personServices.filter((s) => s.status !== 'Closed' && s.status !== 'Cancelled');
    if (active.length === 0) return;
    active.sort((a, b) => {
      const diff = getServiceLatestTimestamp(b) - getServiceLatestTimestamp(a);
      return diff !== 0 ? diff : String(b.created_at || b.id).localeCompare(String(a.created_at || a.id));
    });
    const latest = active[0];
    const info = getExpiryInfo(latest, dateInfo);
    if (info.daysRemaining === null) return;
    if (info.isExpired || info.isExpiringThisMonth || info.isExpiringNextMonth || info.daysRemaining <= 60) {
      allAlerts.push({
        service: latest,
        daysLeft: info.daysRemaining,
        isExpired: info.isExpired,
        isThisMonth: info.isExpiringThisMonth,
        isNextMonth: info.isExpiringNextMonth,
        totalRecords: personServices.length,
      });
    }
  });
  allAlerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return {
    allAlerts,
    thisMonthList: allAlerts.filter((a) => a.isThisMonth),
    nextMonthList: allAlerts.filter((a) => a.isNextMonth),
    expiredList: allAlerts.filter((a) => a.isExpired),
  };
}

export function getWhatsAppUrl(phoneVal: string, nameVal: string, refVal: string, expiryVal: string) {
  if (!phoneVal) return null;
  const clean = String(phoneVal).replace(/[^0-9]/g, '');
  if (!clean) return null;
  const text = `Hello ${nameVal || 'Customer'},\nRegarding your UAE Visit Visa (Ref: ${refVal || ''}, Expiry: ${expiryVal || 'N/A'}). Please let us know if you need to extend or renew.\nBest regards,\nNextStep Travel`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export function exportVisaSpreadsheet(
  items: any[],
  fileNamePrefix: string,
  format: 'xlsx' | 'csv',
  dateInfo: DateInfo
) {
  if (!items?.length) {
    toast.error('No data to export!');
    return;
  }
  const rows = items.map((s) => {
    const cust = s.customers;
    const details = s.details || {};
    const fin = s.financials || {};
    const info = getExpiryInfo(s, dateInfo);
    let expiryStatus = 'Active';
    if (info.isExpired) expiryStatus = `EXPIRED (${Math.abs(info.daysRemaining || 0)} days ago)`;
    else if (info.isExpiringThisMonth) expiryStatus = `Expiring This Month (${info.daysRemaining}d left)`;
    else if (info.isExpiringNextMonth) expiryStatus = `Expiring Next Month (${info.daysRemaining}d left)`;
    else if (info.daysRemaining !== null) expiryStatus = `${info.daysRemaining} days left`;
    const receiving = Number(fin?.receiving_amount || 0);
    const supplierCost = Number(fin?.supplier_cost || 0);
    return {
      'Ref ID': s.reference_id || '',
      'Customer Name': cust?.name || details?.customer_name || '',
      'Phone Number': cust?.phone || details?.phone || '',
      'Passport Number': cust?.passport_no || details?.passport_no || '',
      'Category / Mode': s.category || '',
      'Visa Supplier': details?.visa_supplier || '',
      'Visa Duration': details?.visa_duration || '',
      'Visa Issued Date': details?.visa_issued_date || '',
      'Booking Date': details?.booking_date || details?.visa_issued_date || '',
      'Travel Date': details?.travel_date || '',
      'Visa Expiry Date': info.expiryStr || details?.visa_expiry_date || '',
      'Expiry Status': expiryStatus,
      'Status': s.status || '',
      'Amount (AED)': Number(fin?.amount || 0),
      'Receiving Amount (AED)': receiving,
      'Supplier Cost (AED)': supplierCost,
      'Gross Profit (AED)': receiving - supplierCost,
      'Payment Method': fin?.payment_method || details?.payment_method || '',
      'Handled By': details?.handled_by || '',
      'Referred By': details?.referred_by || '',
      'Notes': details?.comments || details?.remark || details?.notes || '',
    };
  });
  const filename = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}`;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.min(Math.max(key.length + 2, 10), 40),
  }));
  if (format === 'csv') {
    const blob = new Blob([XLSX.utils.sheet_to_csv(worksheet)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${rows.length} records to CSV!`);
    return;
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'UAE Visas');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
  toast.success(`Exported ${rows.length} records to Excel (.xlsx)!`);
}
