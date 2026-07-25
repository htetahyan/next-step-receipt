'use client';

import React from 'react';
import { Shield, PlusCircle, CheckCircle, Eye, Phone, AlertTriangle, ChevronRight, User, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { STATUS_COLORS } from '@/lib/statusColors';

interface Props {
  services: any[];
  onSelectService: (service: any) => void;
  onQuickStatusChange: (serviceId: string, newStatus: string) => void;
  getExpiryInfo: (service: any) => any;
}

const STAGES = ['Open', 'In Progress', 'Closed', 'Cancelled', 'Refund Pending'];

export default function OdooKanbanView({
  services,
  onSelectService,
  onQuickStatusChange,
  getExpiryInfo,
}: Props) {
  // Group services by status
  const grouped = React.useMemo(() => {
    const map: Record<string, any[]> = {
      'Open': [],
      'In Progress': [],
      'Closed': [],
      'Cancelled': [],
      'Refund Pending': [],
    };

    services.forEach(s => {
      const st = s.status && map[s.status] ? s.status : 'Open';
      map[st].push(s);
    });

    return map;
  }, [services]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const stageItems = grouped[stage] || [];
        const stageTotal = stageItems.reduce((acc, s) => acc + (Number(s.financials?.amount) || 0), 0);

        return (
          <div
            key={stage}
            className="flex flex-col bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-3 min-w-[260px] h-full"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  stage === 'Open' ? 'bg-amber-500' :
                  stage === 'In Progress' ? 'bg-blue-500' :
                  stage === 'Closed' ? 'bg-green-500' :
                  stage === 'Cancelled' ? 'bg-red-500' : 'bg-purple-500'
                }`} />
                <span className="font-semibold text-xs uppercase tracking-wider">{stage}</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--card-bg)] text-xs font-mono font-bold opacity-75">
                  {stageItems.length}
                </span>
              </div>
              
              <div className="text-[11px] font-mono opacity-60 font-medium">
                {stageTotal.toLocaleString()} AED
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {stageItems.map(service => {
                const cust = service.customers;
                const details = service.details as any;
                const fin = service.financials as any;
                const { expiryStr, isExpiringThisMonth, isExpiringNextMonth, isExpired, daysRemaining } = getExpiryInfo(service);
                const phoneNum = cust?.phone || details?.phone;
                const profit = (Number(fin?.receiving_amount) || 0) - (Number(fin?.supplier_cost) || 0);

                return (
                  <div
                    key={service.id}
                    onClick={() => onSelectService(service)}
                    className="card-anthropic p-3.5 cursor-pointer hover:border-[#D97757]/50 hover:shadow-md transition-all space-y-2.5 group relative"
                  >
                    {/* Top Row: Ref & Expiry Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-xs font-bold text-[#D97757]">
                        {service.reference_id || 'Ref N/A'}
                      </div>

                      {expiryStr && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                          isExpired
                            ? 'bg-red-500 text-white animate-pulse'
                            : isExpiringThisMonth
                            ? 'bg-amber-500 text-white'
                            : isExpiringNextMonth
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {isExpired ? `Expired (${Math.abs(daysRemaining || 0)}d)` : `${daysRemaining}d left`}
                        </span>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div>
                      <h4 className="font-bold text-sm line-clamp-1 group-hover:text-[#D97757] transition-colors">
                        {cust?.name || details?.customer_name || 'Unnamed Customer'}
                      </h4>
                      <div className="text-[11px] opacity-75 font-mono flex items-center gap-1 mt-0.5 flex-wrap">
                        <span>Pass: {cust?.passport_no || details?.passport_no || '—'}</span>
                        {phoneNum && (
                          <span className="text-[#D97757] font-sans font-medium flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {phoneNum}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visa Supplier & Category */}
                    <div className="flex items-center justify-between text-xs opacity-75 border-t border-black/5 dark:border-white/5 pt-2">
                      <span className="truncate max-w-[120px] font-medium">{details?.visa_supplier || service.category || 'Visa Service'}</span>
                      <span className="font-mono text-[11px]">{details?.visa_duration || ''}</span>
                    </div>

                    {/* Financial Metrics */}
                    <div className="flex items-center justify-between text-xs font-mono bg-[var(--sidebar-bg)] p-2 rounded-lg">
                      <div>
                        <span className="text-[10px] opacity-50 block uppercase">Receiving</span>
                        <span className="font-semibold text-blue-600">{Number(fin?.receiving_amount || 0).toLocaleString()} AED</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] opacity-50 block uppercase">Profit</span>
                        <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profit.toLocaleString()} AED
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectService(service);
                        }}
                        className="text-xs font-semibold text-[#D97757] hover:underline flex items-center gap-0.5"
                      >
                        <Eye className="w-3 h-3" /> Quick Edit
                      </button>

                      {stage !== 'Closed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickStatusChange(service.id, 'Closed');
                          }}
                          className="p-1 rounded hover:bg-green-500/10 text-green-600 transition-colors"
                          title="Mark Closed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {stageItems.length === 0 && (
                <div className="py-12 text-center text-xs opacity-50 font-serif border-2 border-dashed border-[var(--card-border)] rounded-xl">
                  No records in {stage}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
