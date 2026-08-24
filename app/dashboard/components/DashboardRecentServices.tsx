'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Plane, 
  Map, 
  Globe, 
  ArrowUpRight, 
  Search, 
  Sparkles, 
  User, 
  Calendar, 
  Tag, 
  Filter,
  DollarSign
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { parseFinancialNumber } from '@/lib/financialUtils';
import { mapCategoryToModule } from '@/lib/auth-permissions';

interface RecentServiceItem {
  id: string;
  customer_id?: string;
  reference_id?: string;
  category?: string;
  status?: string;
  details?: any;
  financials?: any;
  created_at?: string;
  customer?: {
    id?: string;
    name?: string;
    passport_no?: string;
  };
}

interface DashboardRecentServicesProps {
  services: RecentServiceItem[];
}

export function DashboardRecentServices({ services }: DashboardRecentServicesProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const getServiceLink = (srv: RecentServiceItem) => {
    const mod = mapCategoryToModule(srv.category);
    switch (mod) {
      case 'air_tickets':
        return `/dashboard/air-tickets/${srv.id}`;
      case 'tour_packages':
        return `/dashboard/tour-packages/${srv.id}`;
      case 'other_visa':
        return `/dashboard/other-visa/${srv.id}`;
      case 'uae_visa':
      default:
        return `/dashboard/uae-visa/${srv.id}`;
    }
  };

  const getCategoryIcon = (category?: string) => {
    const mod = mapCategoryToModule(category);
    switch (mod) {
      case 'air_tickets':
        return <Plane className="w-3.5 h-3.5 text-blue-500" />;
      case 'tour_packages':
        return <Map className="w-3.5 h-3.5 text-emerald-500" />;
      case 'other_visa':
        return <Globe className="w-3.5 h-3.5 text-purple-500" />;
      case 'uae_visa':
      default:
        return <Shield className="w-3.5 h-3.5 text-[#D97757]" />;
    }
  };

  const getServiceSpecificLabel = (srv: RecentServiceItem) => {
    const details = srv.details || {};
    const mod = mapCategoryToModule(srv.category);

    if (mod === 'air_tickets') {
      const parts = [];
      if (details.airline) parts.push(details.airline);
      if (details.sector) parts.push(details.sector);
      if (details.pnr) parts.push(`PNR: ${details.pnr}`);
      return parts.join(' • ') || srv.category || 'Air Ticket';
    }

    if (mod === 'tour_packages') {
      if (details.tour_plans) return details.tour_plans;
      if (details.supplier_name) return `${srv.category || 'Tour'} (${details.supplier_name})`;
      return srv.category || 'Tour Package';
    }

    if (mod === 'other_visa') {
      const parts = [];
      if (srv.category) parts.push(srv.category);
      if (details.visa_type) parts.push(details.visa_type);
      if (details.visa_supplier) parts.push(details.visa_supplier);
      return parts.join(' • ') || 'Other Visa';
    }

    // UAE Visa
    const parts = [];
    if (srv.category) parts.push(srv.category);
    if (details.visa_duration && !String(srv.category).includes(details.visa_duration)) {
      parts.push(details.visa_duration);
    }
    if (details.visa_supplier) parts.push(details.visa_supplier);
    return parts.join(' • ') || 'UAE Visa';
  };

  const parseFormattedDate = (rawDate?: string | null) => {
    if (!rawDate) return null;
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(String(rawDate))) {
        return format(parseISO(String(rawDate)), 'dd MMM yyyy');
      }
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? String(rawDate) : format(d, 'dd MMM yyyy');
    } catch {
      return String(rawDate);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const details = srv.details || {};
      const cust = srv.customer || {};
      const mod = mapCategoryToModule(srv.category);

      // Search Query Match
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const refMatch = String(srv.reference_id || '').toLowerCase().includes(q);
        const nameMatch = String(cust.name || '').toLowerCase().includes(q);
        const passMatch = String(cust.passport_no || '').toLowerCase().includes(q);
        const catMatch = String(srv.category || '').toLowerCase().includes(q);
        const airlineMatch = String(details.airline || '').toLowerCase().includes(q);
        const sectorMatch = String(details.sector || '').toLowerCase().includes(q);
        const supplierMatch = String(details.visa_supplier || details.supplier_name || '').toLowerCase().includes(q);
        const staffMatch = String(details.handled_by || '').toLowerCase().includes(q);

        if (!refMatch && !nameMatch && !passMatch && !catMatch && !airlineMatch && !sectorMatch && !supplierMatch && !staffMatch) {
          return false;
        }
      }

      // Category Filter
      if (categoryFilter !== 'all' && mod !== categoryFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && srv.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [services, search, categoryFilter, statusFilter]);

  return (
    <div className="card-anthropic overflow-hidden shadow-sm">
      {/* Header & Controls */}
      <div className="p-6 border-b border-[var(--card-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#D97757]" />
            <div>
              <h3 className="text-base font-serif font-medium">Recent Services Ledger</h3>
              <p className="text-xs opacity-50 font-mono mt-0.5">
                Last {services.length} active & completed bookings with live profit telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, customer, route, staff..."
                className="input-anthropic pl-8 pr-3 py-1.5 text-xs w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Category & Status Quick Filter Chips */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--card-border)]/60 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {[
              { id: 'all', label: `All (${services.length})` },
              { id: 'uae_visa', label: 'UAE Visa' },
              { id: 'air_tickets', label: 'Air Tickets' },
              { id: 'tour_packages', label: 'Tour Packages' },
              { id: 'other_visa', label: 'Other Visas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-[#D97757] text-white shadow-xs'
                    : 'bg-[var(--sidebar-bg)] border border-[var(--card-border)] hover:border-[#D97757]/40 opacity-75 hover:opacity-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {['all', 'Open', 'In Progress', 'Closed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  statusFilter === st
                    ? 'bg-[var(--foreground)] text-[var(--background)] font-bold'
                    : 'opacity-50 hover:opacity-100'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-[10px] uppercase tracking-wider opacity-70 font-mono">
            <tr>
              <th className="px-6 py-3 font-medium">Ref & Type</th>
              <th className="px-6 py-3 font-medium">Service Details</th>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Service Date</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Receiving (AED)</th>
              <th className="px-6 py-3 text-right font-medium">Cost (AED)</th>
              <th className="px-6 py-3 text-right font-medium">Gross Profit</th>
              <th className="px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {filteredServices.map((srv) => {
              const details = srv.details || {};
              const fin = srv.financials || {};
              const cust = srv.customer || {};

              const amt = parseFinancialNumber(fin.amount, 0);
              const discount = parseFinancialNumber(fin.discount, 0);
              const receiving = parseFinancialNumber(fin.receiving_amount, amt - discount);
              const cost = parseFinancialNumber(fin.supplier_cost, 0);
              const refund = parseFinancialNumber(fin.refund, 0);
              const profit = receiving - cost - refund;
              const isProfitPositive = profit >= 0;
              const travelDate = parseFormattedDate(details.travel_date || details.departure_date || details.visa_issued_date);
              const createdDate = parseFormattedDate(srv.created_at);
              const serviceLabel = getServiceSpecificLabel(srv);
              const serviceUrl = getServiceLink(srv);

              return (
                <tr key={srv.id} className="hover:bg-[var(--sidebar-bg)] transition-colors group">
                  {/* Ref & Category Icon */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(srv.category)}
                      <Link
                        href={serviceUrl}
                        className="font-mono text-xs font-bold text-[#D97757] hover:underline"
                      >
                        {srv.reference_id || 'REF-N/A'}
                      </Link>
                    </div>
                  </td>

                  {/* Specific Service Details */}
                  <td className="px-6 py-3.5 max-w-xs">
                    <div className="font-medium text-xs truncate" title={serviceLabel}>
                      {serviceLabel}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    {srv.customer_id ? (
                      <Link
                        href={`/dashboard/customers/${srv.customer_id}`}
                        className="text-xs font-medium hover:text-[#D97757] transition-colors flex items-center gap-1.5"
                      >
                        <User className="w-3 h-3 opacity-40" />
                        <span>{cust.name || details.customer_name || 'Customer'}</span>
                      </Link>
                    ) : (
                      <span className="text-xs opacity-70">
                        {cust.name || details.customer_name || 'Walk-in'}
                      </span>
                    )}
                    {cust.passport_no && (
                      <div className="text-[10px] opacity-50 font-mono tracking-wider">
                        {cust.passport_no}
                      </div>
                    )}
                  </td>

                  {/* Service Date: Travel Date + Created At */}
                  <td className="px-6 py-3.5 whitespace-nowrap text-xs font-mono">
                    {travelDate ? (
                      <div>
                        <div className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                          <Calendar className="w-3 h-3 text-[#D97757]" />
                          <span>{travelDate}</span>
                        </div>
                        {createdDate && (
                          <div className="text-[10px] opacity-50 mt-0.5">
                            Booked: {createdDate}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-70">
                        <Calendar className="w-3 h-3 opacity-40" />
                        <span>{createdDate || '—'}</span>
                      </div>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        srv.status === 'Closed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : srv.status === 'In Progress'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : srv.status === 'Cancelled'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {srv.status || 'Open'}
                    </span>
                  </td>

                  {/* Receiving Amount */}
                  <td className="px-6 py-3.5 text-right font-mono text-xs font-semibold">
                    {receiving.toLocaleString()} <span className="text-[10px] opacity-50">AED</span>
                  </td>

                  {/* Supplier Cost */}
                  <td className="px-6 py-3.5 text-right font-mono text-xs opacity-70">
                    {cost.toLocaleString()} <span className="text-[10px] opacity-50">AED</span>
                  </td>

                  {/* Net Gross Profit */}
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        isProfitPositive
                          ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {isProfitPositive ? `+${profit.toLocaleString()}` : profit.toLocaleString()} AED
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={serviceUrl}
                      className="text-xs text-[#D97757] hover:underline font-mono inline-flex items-center gap-0.5 opacity-80 group-hover:opacity-100"
                    >
                      Details <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}

            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center opacity-50 text-xs font-serif">
                  No services match your filters.
                  {search && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setCategoryFilter('all');
                        setStatusFilter('all');
                      }}
                      className="ml-2 text-[#D97757] underline font-sans"
                    >
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary info */}
      <div className="p-4 border-t border-[var(--card-border)] bg-[var(--sidebar-bg)] flex items-center justify-between text-xs opacity-70 font-mono">
        <span>Showing {filteredServices.length} of {services.length} recent bookings</span>
        <div className="flex items-center gap-4">
          <span>
            Total Displayed Profit:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {filteredServices
                .reduce((acc, s) => {
                  const fin = s.financials || {};
                  const amt = parseFinancialNumber(fin.amount, 0);
                  const disc = parseFinancialNumber(fin.discount, 0);
                  const rec = parseFinancialNumber(fin.receiving_amount, amt - disc);
                  const cost = parseFinancialNumber(fin.supplier_cost, 0);
                  const ref = parseFinancialNumber(fin.refund, 0);
                  return acc + (rec - cost - ref);
                }, 0)
                .toLocaleString()}{' '}
              AED
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
