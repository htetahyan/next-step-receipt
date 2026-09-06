'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  FileText,
  ArrowLeft,
  Plus,
  Pencil,
  Copy,
  Check,
  Receipt,
  FolderOpen,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MessageCircle,
  ExternalLink,
  Search,
  X,
  Filter,
  Briefcase,
  Shield,
  Plane,
  Map,
  Globe,
  Wrench,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import NewServiceDialog from '@/components/NewServiceDialog';
import DocumentModal from '@/components/DocumentModal';
import CustomerDocumentsSection from '@/components/CustomerDocumentsSection';
import { CustomerInvoicesSection } from './components/CustomerInvoicesSection';
import { CustomerServiceCard } from './components/CustomerServiceCard';
import { CustomerFinancialLedger } from './components/CustomerFinancialLedger';
import EditCustomerModal from './components/EditCustomerModal';
import { parseFinancialNumber } from '@/lib/financialUtils';
import { mapCategoryToModule } from '@/lib/auth-permissions';

type TabKey = 'services' | 'invoices' | 'documents' | 'financials';

export default function CustomerHubClient({
  customer,
  services = [],
  pastInvoices = [],
  documents = [],
}: {
  customer: any;
  services: any[];
  pastInvoices: any[];
  documents: any[];
}) {
  const router = useRouter();

  // Modals state
  const [activeTab, setActiveTab] = useState<TabKey>('services');
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Passport copy feedback
  const [copiedPassport, setCopiedPassport] = useState(false);

  // Services filtering & search
  const [serviceSearch, setServiceSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const passportNo = customer?.passport_no || customer?.passportNo || '';
  const cleanPhone = (customer?.phone || '').replace(/[^0-9]/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${customer.name}, regarding your travel service:`)}`
    : null;

  const handleCopyPassport = () => {
    if (!passportNo) return;
    navigator.clipboard.writeText(passportNo);
    setCopiedPassport(true);
    toast.success('Passport number copied to clipboard');
    setTimeout(() => setCopiedPassport(false), 2000);
  };

  // Financial aggregates
  const financials = useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;
    let totalCost = 0;
    let totalRefund = 0;
    let totalBalance = 0;
    let activeServicesCount = 0;

    services.forEach((srv) => {
      if (srv.status === 'Open' || srv.status === 'In Progress') {
        activeServicesCount++;
      }
      if (srv.status === 'Cancelled') return;

      const fin = srv.financials || {};
      const amt = parseFinancialNumber(fin.amount, 0);
      const disc = parseFinancialNumber(fin.discount, 0);
      const rec = parseFinancialNumber(fin.receiving_amount, amt - disc);
      const cost = parseFinancialNumber(fin.supplier_cost, 0);
      const ref = parseFinancialNumber(fin.refund, 0);
      const bal = parseFinancialNumber(fin.balance, 0);

      totalBilled += amt;
      totalCollected += rec;
      totalCost += cost;
      totalRefund += ref;
      totalBalance += bal;
    });

    const netProfit = totalCollected - totalCost - totalRefund;
    const marginPercent = totalCollected > 0 ? Math.round((netProfit / totalCollected) * 100) : 0;

    return {
      totalBilled,
      totalCollected,
      totalCost,
      netProfit,
      totalBalance,
      marginPercent,
      activeServicesCount,
    };
  }, [services]);

  // Filtered services for Services tab
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const details = srv.details || {};
      const refId = (srv.reference_id || '').toLowerCase();
      const category = (srv.category || '').toLowerCase();
      const notes = (details.notes || details.comments || details.destination || '').toLowerCase();
      const passengers = (details.passengers || []).map((p: any) => (p.name || '') + ' ' + (p.passport_no || '')).join(' ').toLowerCase();

      // Search match
      if (serviceSearch.trim()) {
        const q = serviceSearch.toLowerCase().trim();
        const matches = refId.includes(q) || category.includes(q) || notes.includes(q) || passengers.includes(q);
        if (!matches) return false;
      }

      // Category match
      if (categoryFilter !== 'all') {
        const mod = mapCategoryToModule(srv.category);
        if (mod !== categoryFilter) return false;
      }

      // Status match
      if (statusFilter !== 'all') {
        if (srv.status !== statusFilter) return false;
      }

      return true;
    });
  }, [services, serviceSearch, categoryFilter, statusFilter]);

  const joinDate = useMemo(() => {
    if (!customer?.created_at) return 'Recently';
    try {
      return format(parseISO(customer.created_at), 'dd MMM yyyy');
    } catch (e) {
      return 'Active Member';
    }
  }, [customer?.created_at]);

  const initials = useMemo(() => {
    if (!customer?.name) return 'C';
    const parts = customer.name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [customer?.name]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12 animate-in fade-in duration-300">
      {/* 1. TOP COMMAND BAR & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--card-border)] pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/customers"
            className="p-2 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--card-border)] hover:bg-[var(--card-border)] text-gray-400 hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Back to Clients"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-50 font-mono">Directory /</span>
              <h1 className="text-xl font-serif font-medium text-[var(--foreground)]">{customer.name}</h1>
              {financials.activeServicesCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {financials.activeServicesCount} Active
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-60 font-mono mt-0.5">
              Customer ID: {customer.id.slice(0, 8)}... • Joined {joinDate}
            </p>
          </div>
        </div>

        {/* Action Buttons Cluster */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
              title="Message Client on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">WhatsApp</span>
            </a>
          )}

          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] text-xs font-medium transition-all"
              title="Call Customer"
            >
              <Phone className="w-3.5 h-3.5 opacity-70" />
              <span className="hidden md:inline">Call</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] text-xs font-medium transition-all cursor-pointer"
            title="Edit Customer Profile"
          >
            <Pencil className="w-3.5 h-3.5 opacity-70" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDocsModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] text-xs font-medium transition-all cursor-pointer"
            title="Manage Customer Documents"
          >
            <FolderOpen className="w-3.5 h-3.5 opacity-70" />
            <span>Docs</span>
          </button>

          <button
            type="button"
            onClick={() => setIsServiceDialogOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3.5 bg-[#D97757] hover:bg-[#c66446] text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Service</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE 4-METRIC KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Bookings */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Bookings</span>
            <Briefcase className="w-3.5 h-3.5 text-[#D97757]" />
          </div>
          <div className="text-lg font-serif font-semibold text-[var(--foreground)]">
            {services.length} <span className="text-xs font-normal opacity-60 font-mono">Services</span>
          </div>
          <div className="text-[10px] opacity-60 font-mono mt-1 pt-1 border-t border-[var(--card-border)]">
            {financials.activeServicesCount} in progress
          </div>
        </div>

        {/* Metric 2: Lifetime Spend */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Lifetime Spend</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-serif font-semibold text-blue-600 dark:text-blue-400">
            {financials.totalCollected.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
          </div>
          <div className="text-[10px] opacity-60 font-mono mt-1 pt-1 border-t border-[var(--card-border)]">
            Gross sales: {financials.totalBilled.toLocaleString()} AED
          </div>
        </div>

        {/* Metric 3: Gross Profit Generated */}
        <div className="card-anthropic p-3.5 flex flex-col justify-between border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
              Net Profit
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded">
              {financials.marginPercent}%
            </span>
          </div>
          <div className={`text-lg font-serif font-semibold ${financials.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
            {financials.netProfit.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
          </div>
          <div className="text-[10px] opacity-70 font-mono mt-1 pt-1 border-t border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
            After supplier costs
          </div>
        </div>

        {/* Metric 4: Outstanding Balance */}
        <div className={`card-anthropic p-3.5 flex flex-col justify-between shadow-xs ${financials.totalBalance > 0 ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Account Balance</span>
            {financials.totalBalance > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>
          <div className={`text-lg font-serif font-semibold ${financials.totalBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {financials.totalBalance.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
          </div>
          <div className="text-[10px] opacity-60 font-mono mt-1 pt-1 border-t border-[var(--card-border)]">
            {financials.totalBalance > 0 ? 'Payment pending' : 'All accounts settled'}
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE GRID: LEFT PROFILE CARD + RIGHT TABBED CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Premium Profile Identity Card */}
        <div className="lg:col-span-4 space-y-3">
          <div className="card-anthropic p-4 sm:p-5 relative shadow-xs">
            {/* Top Monogram & Name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D97757] to-[#b35738] text-white flex items-center justify-center font-serif text-lg font-bold shadow-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-serif font-semibold text-[var(--foreground)] truncate">
                  {customer.name}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono opacity-50">Customer</span>
                  <span className="text-[10px] opacity-30">•</span>
                  <span className="text-[10px] opacity-60 font-mono">{documents.length} Docs</span>
                </div>
              </div>
            </div>

            {/* Passport Monospace Pill with 1-Click Copy */}
            <div className="p-2.5 rounded-xl bg-[var(--sidebar-bg)] border border-[var(--card-border)] mb-4">
              <div className="flex items-center justify-between text-[11px] opacity-60 mb-1 font-mono">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#D97757]" /> Passport Number
                </span>
                {passportNo && (
                  <button
                    type="button"
                    onClick={handleCopyPassport}
                    className="flex items-center gap-1 text-[10px] text-[#D97757] hover:underline cursor-pointer"
                  >
                    {copiedPassport ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="font-mono text-sm font-bold tracking-wider text-[var(--foreground)]">
                {passportNo || <span className="opacity-40 font-normal italic text-xs">No passport provided</span>}
              </div>
            </div>

            {/* Contact Details List */}
            <div className="space-y-2.5 text-xs">
              {/* Phone */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--card-border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-3.5 h-3.5 opacity-50 shrink-0 text-[#D97757]" />
                  <span className="font-mono text-[11px] truncate opacity-90">
                    {customer.phone || 'No phone recorded'}
                  </span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-1 shrink-0">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a
                      href={`tel:${customer.phone}`}
                      className="p-1 rounded text-blue-600 hover:bg-blue-500/10 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--card-border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 opacity-50 shrink-0 text-[#D97757]" />
                  <span className="text-[11px] truncate opacity-90">
                    {customer.email || 'No email recorded'}
                  </span>
                </div>
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="p-1 rounded text-amber-600 hover:bg-amber-500/10 transition-colors shrink-0"
                    title="Send Email"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--card-border)]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 opacity-50 text-[#D97757]" />
                  <span className="text-[11px] opacity-70 font-mono">Member Since</span>
                </div>
                <span className="font-mono text-[11px] font-medium opacity-90">{joinDate}</span>
              </div>
            </div>

            {/* Quick Edit Profile Button */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="mt-4 w-full h-8 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)] text-xs font-medium transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 opacity-60" />
              Edit Profile Details
            </button>
          </div>

          {/* Quick Invoice Action Link Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#D97757]/10 via-[var(--card-bg)] to-[var(--card-bg)] border border-[#D97757]/20 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">Need to bill this client?</p>
              <p className="text-[10px] opacity-60">Generate professional receipt or tax invoice</p>
            </div>
            <Link
              href={`/dashboard/invoices/new?customerId=${customer.id}`}
              className="px-3 py-1.5 rounded-lg bg-[#D97757] hover:bg-[#c66446] text-white text-xs font-medium shadow-xs transition-all shrink-0"
            >
              New Invoice
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: High-Efficiency Tabbed Workspace */}
        <div className="lg:col-span-8 space-y-3">
          {/* Segmented Tab Navigation Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-1 shadow-xs">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('services')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'services'
                    ? 'bg-[var(--card-bg)] shadow-xs text-[#D97757]'
                    : 'opacity-60 hover:opacity-100 text-[var(--foreground)]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Services
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'services' ? 'bg-[#D97757]/15 text-[#D97757]' : 'bg-[var(--card-border)] opacity-70'}`}>
                  {services.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-[var(--card-bg)] shadow-xs text-[#D97757]'
                    : 'opacity-60 hover:opacity-100 text-[var(--foreground)]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Invoices
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'invoices' ? 'bg-[#D97757]/15 text-[#D97757]' : 'bg-[var(--card-border)] opacity-70'}`}>
                  {pastInvoices.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'documents'
                    ? 'bg-[var(--card-bg)] shadow-xs text-[#D97757]'
                    : 'opacity-60 hover:opacity-100 text-[var(--foreground)]'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Documents
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'documents' ? 'bg-[#D97757]/15 text-[#D97757]' : 'bg-[var(--card-border)] opacity-70'}`}>
                  {documents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('financials')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'financials'
                    ? 'bg-[var(--card-bg)] shadow-xs text-[#D97757]'
                    : 'opacity-60 hover:opacity-100 text-[var(--foreground)]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Financial Ledger
              </button>
            </div>

            {/* Contextual Shortcut Button */}
            {activeTab === 'services' && (
              <button
                type="button"
                onClick={() => setIsServiceDialogOpen(true)}
                className="flex items-center gap-1 h-7 px-2.5 bg-[#D97757] hover:bg-[#c66446] text-white text-[11px] font-medium rounded-lg shadow-xs transition-all cursor-pointer ml-auto"
              >
                <Plus className="w-3 h-3" /> Add Service
              </button>
            )}
            {activeTab === 'invoices' && (
              <Link
                href={`/dashboard/invoices/new?customerId=${customer.id}`}
                className="flex items-center gap-1 h-7 px-2.5 bg-[#D97757] hover:bg-[#c66446] text-white text-[11px] font-medium rounded-lg shadow-xs transition-all cursor-pointer ml-auto"
              >
                <Plus className="w-3 h-3" /> Create Invoice
              </Link>
            )}
            {activeTab === 'documents' && (
              <button
                type="button"
                onClick={() => setIsDocsModalOpen(true)}
                className="flex items-center gap-1 h-7 px-2.5 bg-[#D97757] hover:bg-[#c66446] text-white text-[11px] font-medium rounded-lg shadow-xs transition-all cursor-pointer ml-auto"
              >
                <Plus className="w-3 h-3" /> Upload File
              </button>
            )}
          </div>

          {/* TAB 1: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              {/* Search & Filter Controls Toolbar */}
              <div className="card-anthropic p-3 space-y-2 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <div className="absolute left-2.5 inset-y-0 flex items-center pointer-events-none">
                      <Search className="w-3.5 h-3.5 opacity-40" />
                    </div>
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Search ref ID, category, passenger, destination..."
                      className="input-anthropic pl-8 pr-7 h-8 text-xs w-full"
                    />
                    {serviceSearch && (
                      <button
                        type="button"
                        onClick={() => setServiceSearch('')}
                        className="absolute right-2 inset-y-0 flex items-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className="text-[10px] font-mono opacity-50">Status:</span>
                    {['all', 'Open', 'In Progress', 'Closed'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          statusFilter === st
                            ? 'bg-[var(--foreground)] text-[var(--background)] font-bold shadow-xs'
                            : 'bg-[var(--sidebar-bg)] border border-[var(--card-border)] opacity-70 hover:opacity-100'
                        }`}
                      >
                        {st === 'all' ? 'All' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[var(--card-border)] text-[11px]">
                  <span className="text-[10px] font-mono opacity-50 flex items-center gap-1 mr-1">
                    <Filter className="w-2.5 h-2.5" /> Category:
                  </span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'uae_visa', label: 'UAE Visa' },
                    { id: 'air_tickets', label: 'Air Tickets' },
                    { id: 'tour_packages', label: 'Tour Packages' },
                    { id: 'other_visa', label: 'Other Visas' },
                    { id: 'custom_service', label: 'Custom' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-[#D97757] text-white font-medium shadow-xs'
                          : 'bg-[var(--sidebar-bg)] border border-[var(--card-border)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                  {(serviceSearch || categoryFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setServiceSearch('');
                        setCategoryFilter('all');
                        setStatusFilter('all');
                      }}
                      className="text-[10px] text-[#D97757] hover:underline ml-auto font-mono cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Service Cards List */}
              <div className="space-y-3">
                {filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-[var(--card-border)] border-dashed rounded-2xl bg-[var(--sidebar-bg)]">
                    <Briefcase className="w-8 h-8 opacity-40 mb-2 text-[#D97757]" />
                    <p className="text-xs font-medium text-[var(--foreground)]">
                      {serviceSearch || categoryFilter !== 'all' || statusFilter !== 'all'
                        ? 'No bookings match your active filters.'
                        : 'No services found for this customer.'}
                    </p>
                    <p className="text-[11px] opacity-50 mt-0.5">
                      Book a visa, ticket, tour package, or custom travel service.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsServiceDialogOpen(true)}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#D97757] hover:bg-[#c66446] rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Book First Service
                    </button>
                  </div>
                ) : (
                  filteredServices.map((service) => (
                    <CustomerServiceCard
                      key={service.id}
                      service={service}
                      onUpdated={() => router.refresh()}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES */}
          {activeTab === 'invoices' && (
            <CustomerInvoicesSection customerId={customer.id} pastInvoices={pastInvoices} />
          )}

          {/* TAB 3: DOCUMENTS */}
          {activeTab === 'documents' && (
            <CustomerDocumentsSection
              documents={documents}
              onOpenModal={() => setIsDocsModalOpen(true)}
            />
          )}

          {/* TAB 4: FINANCIAL LEDGER */}
          {activeTab === 'financials' && (
            <CustomerFinancialLedger services={services} invoices={pastInvoices} />
          )}
        </div>
      </div>

      {/* 4. MODALS & DIALOGS */}
      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
        onSuccess={() => router.refresh()}
      />

      {/* Global Document Modal */}
      <DocumentModal
        isOpen={isDocsModalOpen}
        onClose={() => {
          setIsDocsModalOpen(false);
          router.refresh();
        }}
        customerId={customer.id}
        customerName={customer.name}
      />

      {/* Add New Service Dialog */}
      <NewServiceDialog
        isOpen={isServiceDialogOpen}
        onClose={() => {
          setIsServiceDialogOpen(false);
          router.refresh();
        }}
        customerId={customer.id}
        customerName={customer.name}
        customerMetadata={customer.metadata}
      />
    </div>
  );
}