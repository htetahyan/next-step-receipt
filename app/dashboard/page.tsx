import { createClient } from '@/utils/supabase/server'
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users, 
  Percent, 
  TrendingDown, 
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Ban
} from 'lucide-react'
import SalesChart from '@/components/SalesChart'
import DashboardFilters from '@/components/DashboardFilters'
import VisaReminders from '@/components/VisaReminders'
import { subDays, startOfDay, format, isAfter, isBefore, parseISO, eachDayOfInterval, differenceInDays, startOfMonth, startOfYear } from 'date-fns'
import Link from 'next/link'

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string; category?: string; status?: string; from?: string; to?: string }> }) {
  const { range = '7d', category = 'all', status = 'all', from, to } = await searchParams;
  const supabase = await createClient()

  let metrics = {
    totalRevenue: 0,
    totalReceiving: 0,
    totalCost: 0,
    grossProfit: 0,
    visaPipeline: 0,
    totalServices: 0,
    invoicesCount: 0,
    activeCustomers: 0,
    recentInvoices: [] as any[]
  };

  let alerts: {
    negativeProfit: any[];
    nearExpiry: any[];
  } = {
    negativeProfit: [],
    nearExpiry: []
  };

  let chartData: { name: string; value: number }[] = [];

  try {
    const { data: allInvoices, error: invError } = await supabase
      .from('invoices')
      .select('id, customer_id, invoice_number, total_amount, payment_method, created_at, customer:customers(name)')
      .order('created_at', { ascending: false });

    const { data: allServices, error: servError } = await supabase
      .from('customer_services')
      .select('id, customer_id, reference_id, category, status, details, financials, created_at, customer:customers(id, name, passport_no)')
      .order('created_at', { ascending: false });

    if (!invError && allInvoices && !servError && allServices) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date | undefined;
      
      switch (range) {
        case 'today': startDate = startOfDay(now); break;
        case '7d': startDate = subDays(now, 7); break;
        case '30d': startDate = subDays(now, 30); break;
        case 'this-month': startDate = startOfMonth(now); break;
        case '90d': startDate = subDays(now, 90); break;
        case 'this-year': startDate = startOfYear(now); break;
        case 'custom': 
          startDate = from ? parseISO(from) : subDays(now, 7);
          endDate = to ? parseISO(to) : undefined;
          break;
        default: startDate = subDays(now, 7);
      }

      const parseDateToTimestamp = (dateVal: any): number => {
        if (!dateVal) return 0;
        if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? 0 : dateVal.getTime();
        const str = String(dateVal).trim();
        if (!str) return 0;
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(str)) {
          const parts = str.split(/[\/-]/);
          const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          return isNaN(d.getTime()) ? 0 : d.getTime();
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

      // Helper: get the effective date for a service (only travel_date)
      const getServiceDate = (srv: any): string | null => {
        const details = (srv.details as any) || {};
        const travelDate = details.travel_date;
        if (travelDate) {
          const ts = parseDateToTimestamp(travelDate);
          if (ts > 0) return format(new Date(ts), 'yyyy-MM-dd');
        }
        return null;
      };

      // ── MEMORY FILTERING SERVICES & INVOICES ───────────────────────
      // 1. Date filter
      // Records without travel_date are excluded from date-filtered views
      let filteredServices = (range === 'all' 
        ? allServices 
        : allServices.filter((srv: any) => {
            const dateStr = getServiceDate(srv);
            if (!dateStr) return false;
            const date = parseISO(dateStr);
            if (isNaN(date.getTime())) return false;
            const isAfterStart = isAfter(date, startDate) || format(date, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
            const isBeforeEnd = endDate ? (isBefore(date, endDate) || format(date, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) : true;
            return isAfterStart && isBeforeEnd;
          })) as any[];

      // 2. Category filter
      if (category !== 'all') {
        filteredServices = filteredServices.filter((srv: any) => {
          const cat = String(srv.category || '').toLowerCase();
          const ref = String(srv.reference_id || '').toLowerCase();
          if (category === 'uae-visa') {
            return cat.includes('uae') || ref.startsWith('ae');
          }
          if (category === 'air-ticket') {
            return cat.includes('ticket') || cat.includes('way') || cat.includes('trip') || ref.startsWith('at') || ref.startsWith('tk');
          }
          if (category === 'other-visa') {
            return ref.startsWith('ov') || (!cat.includes('uae') && !ref.startsWith('ae') && !cat.includes('ticket') && !cat.includes('way') && !cat.includes('trip') && !ref.startsWith('at') && !ref.startsWith('tk') && !cat.includes('hotel') && !ref.startsWith('hb'));
          }
          if (category === 'hotel') {
            return cat.includes('hotel') || ref.startsWith('hb');
          }
          return false;
        });
      }

      // 3. Status filter
      if (status !== 'all') {
        filteredServices = filteredServices.filter((srv: any) => srv.status === status);
      }

      // Filter invoices based on date range
      const filteredInvoices = (range === 'all' 
        ? allInvoices 
        : allInvoices.filter((inv: any) => {
            const date = parseISO(inv.created_at);
            const isAfterStart = isAfter(date, startDate) || format(date, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
            const isBeforeEnd = endDate ? (isBefore(date, endDate) || format(date, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) : true;
            return isAfterStart && isBeforeEnd;
          })) as any[];

      // ── AGGREGATE STATS ──────────────────────────────────────────
      const { count: custCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      let totalRevenue = 0;
      let totalReceiving = 0;
      let totalCost = 0;
      let visaPipeline = 0;

      filteredServices.forEach((srv: any) => {
        const fin = srv.financials as any || {};
        const details = srv.details as any || {};
        
        const amt = Number(fin.amount || 0);
        // receiving_amount is amount - discount
        const recAmt = Number(fin.receiving_amount !== undefined ? fin.receiving_amount : (amt - Number(fin.discount || 0)));
        const cst = Number(fin.supplier_cost || 0);
        const bal = Number(fin.balance !== undefined ? fin.balance : (recAmt - cst - Number(fin.refund || 0)));

        totalRevenue += amt;
        totalReceiving += recAmt;
        totalCost += cst;

        // Pipeline tracking if status is not closed/cancelled
        if (srv.status !== 'Closed' && srv.status !== 'Cancelled') {
          if (srv.category !== 'Air Ticket' && srv.category !== 'Hotel Booking') {
            visaPipeline++;
          }
        }

        // ── GENERATE REALTIME ALERTS ──────────────────────────────────
        // Alert 1: Negative/Zero Margin Alert
        const margin = recAmt - cst;
        if (margin < 0 && srv.status !== 'Cancelled') {
          alerts.negativeProfit.push({
            id: srv.id,
            refId: srv.reference_id,
            name: srv.customer?.name || 'Unknown',
            category: srv.category,
            margin: margin,
            receiving: recAmt,
            cost: cst
          });
        }
      });



      // Alert 3: Impending UAE Visa Expiration (within 10 days) — Grouped per person (passport/name)
      const uaeServicesByPerson = new Map<string, any[]>();
      allServices.forEach((srv: any) => {
        const details = srv.details as any || {};
        if (!details.visa_expiry_date) return;

        const cust = srv.customer;
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
          key = `id:${srv.customer_id || srv.id}`;
        }

        if (!uaeServicesByPerson.has(key)) uaeServicesByPerson.set(key, []);
        uaeServicesByPerson.get(key)!.push(srv);
      });

      const getServiceLatestTimestamp = (s: any): number => {
        const d = (s.details as any) || {};
        return Math.max(
          parseDateToTimestamp(s.created_at),
          parseDateToTimestamp(d.travel_date),
          parseDateToTimestamp(d.visa_expiry_date),
          parseDateToTimestamp(d.visa_issued_date)
        );
      };

      uaeServicesByPerson.forEach((personServices) => {
        const activeServices = personServices.filter(s => s.status !== 'Closed' && s.status !== 'Cancelled');
        if (activeServices.length === 0) return;

        const sorted = activeServices.sort((a, b) => {
          const timeA = getServiceLatestTimestamp(a);
          const timeB = getServiceLatestTimestamp(b);
          if (timeA !== timeB) return timeB - timeA;
          return String(b.created_at || b.id).localeCompare(String(a.created_at || a.id));
        });

        const latest = sorted[0];
        const details = (latest.details as any) || {};
        
        let expiryStr = details.visa_expiry_date;
        if (!expiryStr && details.travel_date) {
          const travelTs = parseDateToTimestamp(details.travel_date);
          if (travelTs > 0) {
            const durationDays = parseInt(String(details.visa_duration || '60'), 10) || 60;
            const expDate = new Date(travelTs);
            expDate.setDate(expDate.getDate() + durationDays);
            const yyyy = expDate.getFullYear();
            const mm = String(expDate.getMonth() + 1).padStart(2, '0');
            const dd = String(expDate.getDate()).padStart(2, '0');
            expiryStr = `${yyyy}-${mm}-${dd}`;
          }
        }

        if (!expiryStr) return;

        try {
          const expTs = parseDateToTimestamp(expiryStr);
          if (expTs === 0) return;
          const expDate = new Date(expTs);
          const daysLeft = differenceInDays(expDate, now);
          if (daysLeft >= 0 && daysLeft <= 10) {
            alerts.nearExpiry.push({
              id: latest.id,
              refId: latest.reference_id,
              name: latest.customer?.name || 'Unknown',
              category: latest.category,
              expiryDate: expiryStr,
              daysLeft
            });
          }
        } catch {}
      });

      const grossProfit = totalReceiving - totalCost;

      metrics = {
        totalRevenue,
        totalReceiving,
        totalCost,
        grossProfit,
        visaPipeline,
        totalServices: filteredServices.length,
        invoicesCount: filteredInvoices.length,
        activeCustomers: custCount || 0,
        recentInvoices: filteredInvoices.slice(0, 10)
      };

      const intervalDays = eachDayOfInterval({
        start: range === 'all' ? (filteredServices.length ? parseISO(getServiceDate(filteredServices[filteredServices.length-1]) || format(subDays(now, 7), 'yyyy-MM-dd')) : subDays(now, 7)) : startDate,
        end: now
      });

      const salesMap: Record<string, number> = {};
      filteredServices.forEach(srv => {
        const d = getServiceDate(srv);
        if (d) {
          salesMap[d] = (salesMap[d] || 0) + Number((srv.financials as any)?.amount || 0);
        }
      });

      chartData = intervalDays.map(day => {
        const dKey = format(day, 'yyyy-MM-dd');
        return {
          name: format(day, 'dd MMM'),
          value: salesMap[dKey] || 0
        };
      });
    }
  } catch (e) {
    console.error('Failed to fetch dashboard metrics:', e);
  }

  // Curated color badges and indicators
  const stats = [
    { name: 'Services Revenue', value: `${metrics.totalRevenue.toLocaleString()} AED`, subValue: `Gross Sale value`, icon: DollarSign, trend: 'up' },
    { name: 'Gross Profit', value: `${metrics.grossProfit.toLocaleString()} AED`, subValue: `Receiving - Cost`, icon: TrendingUp, trend: 'profit' },
    { name: 'Visa Pipeline', value: `${metrics.visaPipeline}`, subValue: `Visas In Progress`, icon: FileText, trend: 'neutral' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-16">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[var(--card-border)] pb-8">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm opacity-60 mt-2 font-mono">Real-time metrics, margins, and operational alerts</p>
        </div>
        <DashboardFilters />
      </div>

      {/* Primary Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          let trendColor = "border-amber-500/20";
          let valueColor = "text-slate-900 dark:text-white";
          if (stat.trend === 'profit') {
            trendColor = metrics.grossProfit >= 0 ? "border-green-500/20" : "border-red-500/20";
            valueColor = metrics.grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
          }

          return (
            <div key={stat.name} className={`card-anthropic p-6 flex flex-col justify-between border ${trendColor} transition-transform hover:-translate-y-0.5 duration-200`}>
              <div>
                <p className="text-xs uppercase tracking-widest opacity-60 mb-2">{stat.name}</p>
                <p className={`text-3xl font-serif font-medium ${valueColor}`}>{stat.value}</p>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--card-border)] text-xs opacity-70">
                <span className="font-mono">{stat.subValue}</span>
                <Icon className="h-4 w-4 opacity-70" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Critical Alerts Dashboard Section */}
      {(alerts.negativeProfit.length > 0 || alerts.nearExpiry.length > 0) && (
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-medium flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Urgent Business Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ALERT 1: Negative / Zero Margins */}
            <div className="card-anthropic p-5 border border-red-500/20 bg-red-500/5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400">Negative Profit Margins</h4>
                  <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold">{alerts.negativeProfit.length}</span>
                </div>
                {alerts.negativeProfit.length === 0 ? (
                  <p className="text-sm opacity-60">All services have a positive net margin. Excellent work!</p>
                ) : (
                  <div className="space-y-3 divide-y divide-red-100 dark:divide-red-950/20">
                    {alerts.negativeProfit.slice(0, 4).map((srv: any, idx) => (
                      <div key={srv.id} className={`pt-2 ${idx === 0 ? 'pt-0' : ''} text-xs`}>
                        <div className="flex justify-between font-medium">
                          <span>{srv.name} ({srv.refId})</span>
                          <span className="text-red-600 font-mono">{srv.margin.toLocaleString()} AED</span>
                        </div>
                        <p className="opacity-60 text-[10px] mt-0.5">{srv.category} | Sale: {srv.receiving} vs Cost: {srv.cost}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {alerts.negativeProfit.length > 4 && (
                <div className="text-[10px] opacity-50 mt-2 text-right">+{alerts.negativeProfit.length - 4} more records</div>
              )}
            </div>

            {/* ALERT 2: Impending Visa Expirations */}
            <div className="card-anthropic p-5 border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Visa Expirations (Next 10 Days)</h4>
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold">{alerts.nearExpiry.length}</span>
                </div>
                {alerts.nearExpiry.length === 0 ? (
                  <p className="text-sm opacity-60">No active visas are expiring in the next 10 days.</p>
                ) : (
                  <div className="space-y-3 divide-y divide-blue-100 dark:divide-blue-950/20">
                    {alerts.nearExpiry.slice(0, 4).map((srv: any, idx) => (
                      <div key={srv.id} className={`pt-2 ${idx === 0 ? 'pt-0' : ''} text-xs`}>
                        <div className="flex justify-between font-medium">
                          <span>{srv.name} ({srv.refId})</span>
                          <span className="text-blue-600 font-mono">in {srv.daysLeft} days</span>
                        </div>
                        <p className="opacity-60 text-[10px] mt-0.5">Expires: {srv.expiryDate}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {alerts.nearExpiry.length > 4 && (
                <div className="text-[10px] opacity-50 mt-2 text-right">+{alerts.nearExpiry.length - 4} more records</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* A2A / B2B Action reminders */}
      <VisaReminders />

      {/* Sales Graph Timeline */}
      <div className="card-anthropic p-6">
         <div className="mb-4">
            <h3 className="text-lg font-serif font-normal">Revenue Timeline</h3>
            <p className="text-xs opacity-50 font-mono">Daily volume matching selected filter criteria</p>
         </div>
         <SalesChart data={chartData} />
      </div>

      {/* Recent Activities Invoices list */}
      <div className="card-anthropic overflow-hidden">
        <div className="border-b border-[var(--card-border)] px-8 py-6 flex items-center justify-between">
          <h3 className="text-lg font-serif">Recent Invoice Records</h3>
          <span className="text-xs opacity-60 font-mono">Last {metrics.recentInvoices.length} invoices issued</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm opacity-80">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs uppercase opacity-70">
              <tr>
                <th scope="col" className="px-8 py-5 font-medium tracking-wider">Invoice NO.</th>
                <th scope="col" className="px-8 py-5 font-medium tracking-wider">Client Name</th>
                <th scope="col" className="px-8 py-5 text-right font-medium tracking-wider">Amount (AED)</th>
                <th scope="col" className="px-8 py-5 text-right font-medium tracking-wider">Issue Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {metrics.recentInvoices.map((invoice: any) => (
                <tr key={invoice.id} className="hover:bg-[var(--sidebar-bg)] transition-colors">
                  <td className="whitespace-nowrap px-8 py-5 font-mono text-xs">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-8 py-5 font-medium">{invoice.customer?.name}</td>
                  <td className="px-8 py-5 font-mono text-xs text-right">
                    {Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-5 text-right opacity-70 text-xs font-mono">{invoice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
