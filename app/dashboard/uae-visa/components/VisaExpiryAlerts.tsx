'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronDown, Download, MessageCircle, Phone, PlusCircle } from 'lucide-react';
import { DateInfo, ExpiryAlert, ExpiryFilter, getWhatsAppUrl } from '@/lib/visaTracker';

export default function VisaExpiryAlerts({
  alerts,
  displayed,
  expiryTab,
  expiryFilter,
  dateInfo,
  expanded,
  onToggleExpanded,
  onTab,
  onFilterTable,
  onExport,
}: {
  alerts: { allAlerts: ExpiryAlert[]; thisMonthList: ExpiryAlert[]; nextMonthList: ExpiryAlert[]; expiredList: ExpiryAlert[] };
  displayed: ExpiryAlert[];
  expiryTab: 'all' | 'this_month' | 'next_month' | 'expired';
  expiryFilter: ExpiryFilter;
  dateInfo: DateInfo;
  expanded: boolean;
  onToggleExpanded: () => void;
  onTab: (tab: 'all' | 'this_month' | 'next_month' | 'expired') => void;
  onFilterTable: (filter: ExpiryFilter) => void;
  onExport: (items: any[], prefix: string) => void;
}) {
  if (alerts.allAlerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
          <span>
            Smart Expiry Tracker: <strong className="font-mono text-amber-700 dark:text-amber-400">{alerts.allAlerts.length}</strong> clients need attention
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onFilterTable(expiryFilter === 'in_30_days' ? 'all' : 'in_30_days')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
              expiryFilter === 'in_30_days' ? 'bg-amber-600 text-white' : 'bg-amber-200/60 dark:bg-amber-900/40'
            }`}
          >
            {expiryFilter === 'in_30_days' ? 'Showing Expiring ✕' : 'Filter in Table'}
          </button>
          <button
            onClick={onToggleExpanded}
            className="px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-amber-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>{expanded ? 'Hide Cards' : 'View Cards'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex p-0.5 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg text-xs font-medium">
              {([
                ['all', `All (${alerts.allAlerts.length})`],
                ['this_month', `This Month (${alerts.thisMonthList.length})`],
                ['next_month', `Next Month (${alerts.nextMonthList.length})`],
                ['expired', `Expired (${alerts.expiredList.length})`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => onTab(id)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${expiryTab === id ? 'bg-white dark:bg-amber-800 shadow-xs' : 'opacity-70'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onExport(alerts.thisMonthList.map((a) => a.service), `Expiring_This_Month_${dateInfo.currentMonthName}`)}
                className="px-2.5 py-1 rounded-lg border border-amber-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" /> This Month
              </button>
              <button
                onClick={() => onExport(alerts.nextMonthList.map((a) => a.service), `Expiring_Next_Month_${dateInfo.nextMonthName}`)}
                className="px-2.5 py-1 rounded-lg border border-blue-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" /> Next Month
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map(({ service: s, daysLeft, isExpired, isThisMonth, isNextMonth, totalRecords }) => {
              const cust = s.customers;
              const details = s.details || {};
              const phoneNum = cust?.phone || details?.phone;
              const wa = getWhatsAppUrl(phoneNum, cust?.name || details?.customer_name, s.reference_id, details?.visa_expiry_date);
              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col gap-2 ${
                    isExpired ? 'bg-red-100/80 border-red-300' : isThisMonth ? 'bg-amber-100/60 border-amber-300' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm line-clamp-1">{cust?.name || details?.customer_name || 'Unknown'}</div>
                      <div className="text-[11px] font-mono mt-0.5">Passport: {cust?.passport_no || details?.passport_no || '—'}</div>
                      {phoneNum && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-[#D97757]" />
                          <a href={`tel:${phoneNum}`} className="text-[#D97757] font-semibold">{phoneNum}</a>
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-600">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                      {totalRecords > 1 && <div className="text-[10px] text-blue-600 mt-1">{totalRecords} visa extensions on record</div>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white ${isExpired ? 'bg-red-600' : isThisMonth ? 'bg-amber-500' : 'bg-blue-600'}`}>
                      {isExpired ? `EXPIRED (${Math.abs(daysLeft)}d)` : `${daysLeft}d left`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] border-t border-black/5 pt-2">
                    <div className="font-mono">Expiry: <span className="font-bold">{details?.visa_expiry_date || '—'}</span></div>
                    <Link
                      href={`/dashboard/uae-visa/new?customerId=${cust?.id || s.customer_id || ''}`}
                      className="px-2.5 py-1 rounded-md bg-[#D97757] text-white font-semibold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Extend
                    </Link>
                  </div>
                </div>
              );
            })}
            {displayed.length === 0 && (
              <div className="col-span-full py-6 text-center opacity-60 text-xs">No visa expiry alerts for this tab.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
