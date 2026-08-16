import { createClient } from '@/utils/supabase/server'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Plane,
  Globe,
  Compass,
  FileText,
  CreditCard,
  CalendarCheck,
  CheckCircle2
} from 'lucide-react'
import SalesChart from '@/components/SalesChart'
import DashboardFilters from '@/components/DashboardFilters'
import VisaReminders, { DepartureReminder } from '@/components/VisaReminders'
import { subDays, startOfDay, format, isAfter, isBefore, parseISO, eachDayOfInterval, differenceInDays, startOfMonth, startOfYear } from 'date-fns'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Dashboard({ 
  searchParams 
}: { 
  searchParams: Promise<{ range?: string; category?: string; status?: string; from?: string; to?: string }> 
}) {
  const { range = 'today', category = 'all', status = 'all', from, to } = await searchParams;
  const supabase = await createClient()

  // 1. Parallel Single-Pass Data Ingestion
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
      startDate = from ? parseISO(from) : startOfDay(now);
      endDate = to ? parseISO(to) : undefined;
      break;
    default: startDate = startOfDay(now);
  }

  let allServices: any[] = [];
  let recentInvoices: any[] = [];
  let totalCustomersCount = 0;

  try {
    const [servicesRes, invoicesRes, customersRes] = await Promise.all([
      supabase
        .from('customer_services')
        .select('id, customer_id, reference_id, category, status, details, financials, created_at, customer:customers(id, name, passport_no)')
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, payment_method, date, created_at, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
    ]);

    if (servicesRes.data) allServices = servicesRes.data;
    if (invoicesRes.data) recentInvoices = invoicesRes.data;
    if (customersRes.count) totalCustomersCount = customersRes.count;
  } catch (err) {
    console.error('Error fetching dashboard dataset:', err);
  }

  // 2. High-Performance Single-Pass Memory Aggregation
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

  const getServiceDate = (srv: any): string | null => {
    const details = (srv.details as any) || {};
    const travelDate = details.travel_date || details.application_date || details.booking_date;
    if (travelDate) {
      const ts = parseDateToTimestamp(travelDate);
      if (ts > 0) return format(new Date(ts), 'yyyy-MM-dd');
    }
    // Fallback to created_at if no explicit travel date
    if (srv.created_at) {
      const ts = parseDateToTimestamp(srv.created_at);
      if (ts > 0) return format(new Date(ts), 'yyyy-MM-dd');
    }
    return null;
  };

  let totalRevenue = 0;
  let totalReceiving = 0;
  let totalCost = 0;
  let totalBookingsCount = 0;

  const categoryDistribution: Record<string, { count: number; volume: number }> = {
    'UAE Visa': { count: 0, volume: 0 },
    'Air Tickets': { count: 0, volume: 0 },
    'Tour Packages': { count: 0, volume: 0 },
    'Other Visas': { count: 0, volume: 0 },
  };

  const salesMap: Record<string, number> = {};
  const departureReminders: DepartureReminder[] = [];
  const negativeProfitAlerts: any[] = [];
  const nearExpiryAlerts: any[] = [];
  const uaeServicesByPerson = new Map<string, any[]>();

  const todayStart = startOfDay(now);
  const in7Days = subDays(now, -7);

  allServices.forEach((srv) => {
    const details = (srv.details as any) || {};
    const fin = (srv.financials as any) || {};
    const cust = srv.customer as any;
    const cat = String(srv.category || '').toLowerCase();

    // Categorization
    let mainCategory = 'Other Visas';
    if (cat.includes('uae') || cat.includes('inside') || cat.includes('a2a') || cat.includes('bus') || cat.includes('visit visa')) {
      mainCategory = 'UAE Visa';
    } else if (cat.includes('ticket') || cat.includes('flight') || cat.includes('airline')) {
      mainCategory = 'Air Tickets';
    } else if (cat.includes('tour') || cat.includes('safari') || cat.includes('package') || cat.includes('hotel')) {
      mainCategory = 'Tour Packages';
    }

    // Departure Reminders (Next 7 Days)
    const travelDateStr = details.travel_date;
    if (travelDateStr && srv.status !== 'Closed' && srv.status !== 'Cancelled') {
      const tTs = parseDateToTimestamp(travelDateStr);
      if (tTs > 0) {
        const tDate = new Date(tTs);
        if (tDate >= todayStart && tDate <= in7Days) {
          const daysLeft = differenceInDays(tDate, todayStart);
          departureReminders.push({
            id: srv.id,
            referenceId: srv.reference_id || '',
            customerName: cust?.name || details?.customer_name || 'Guest',
            category: srv.category,
            travelDate: format(tDate, 'dd MMM yyyy'),
            daysLeft,
            isHot: daysLeft <= 2,
            mode: cat
          });
        }
      }
    }

    // Impending Expiry Grouping
    if (details.visa_expiry_date || (details.travel_date && mainCategory === 'UAE Visa')) {
      const rawPassport = cust?.passport_no || details?.passport_no || '';
      const rawName = cust?.name || details?.customer_name || '';
      const key = rawPassport ? `pass:${rawPassport.toUpperCase()}` : `name:${rawName.toLowerCase()}`;
      if (!uaeServicesByPerson.has(key)) uaeServicesByPerson.set(key, []);
      uaeServicesByPerson.get(key)!.push(srv);
    }

    // Filter Evaluation for KPI & Charts
    const sDate = getServiceDate(srv);
    let matchesDate = false;
    if (range === 'all') {
      matchesDate = true;
    } else if (sDate) {
      const d = parseISO(sDate);
      if (!isNaN(d.getTime())) {
        const isAfterStart = isAfter(d, startDate) || format(d, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
        const isBeforeEnd = endDate ? (isBefore(d, endDate) || format(d, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) : true;
        matchesDate = isAfterStart && isBeforeEnd;
      }
    }

    // Category Filter
    let matchesCategory = true;
    if (category !== 'all') {
      if (category === 'uae-visa') matchesCategory = mainCategory === 'UAE Visa';
      else if (category === 'air-ticket') matchesCategory = mainCategory === 'Air Tickets';
      else if (category === 'tour-package') matchesCategory = mainCategory === 'Tour Packages';
      else if (category === 'other-visa') matchesCategory = mainCategory === 'Other Visas';
    }

    // Status Filter
    let matchesStatus = true;
    if (status !== 'all') {
      matchesStatus = srv.status === status;
    }

    if (matchesDate && matchesCategory && matchesStatus) {
      const amt = Number(fin.amount || 0);
      const recAmt = Number(fin.receiving_amount !== undefined ? fin.receiving_amount : (amt - Number(fin.discount || 0)));
      const cst = Number(fin.supplier_cost || 0);

      totalRevenue += amt;
      totalReceiving += recAmt;
      totalCost += cst;
      totalBookingsCount++;

      if (categoryDistribution[mainCategory]) {
        categoryDistribution[mainCategory].count++;
        categoryDistribution[mainCategory].volume += amt;
      }

      if (sDate) {
        salesMap[sDate] = (salesMap[sDate] || 0) + amt;
      }

      // Negative margin alert
      const margin = recAmt - cst;
      if (margin < 0 && srv.status !== 'Cancelled') {
        negativeProfitAlerts.push({
          id: srv.id,
          refId: srv.reference_id,
          name: cust?.name || 'Unknown',
          category: srv.category,
          margin,
          receiving: recAmt,
          cost: cst
        });
      }
    }
  });

  // Calculate Expiry Alerts from Grouped Profiles
  uaeServicesByPerson.forEach((personServices) => {
    const active = personServices.filter(s => s.status !== 'Closed' && s.status !== 'Cancelled');
    if (active.length === 0) return;

    const latest = active.sort((a, b) => (parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at)))[0];
    const details = (latest.details as any) || {};
    let expiryStr = details.visa_expiry_date;
    if (!expiryStr && details.travel_date) {
      const travelTs = parseDateToTimestamp(details.travel_date);
      if (travelTs > 0) {
        const expDate = new Date(travelTs);
        expDate.setDate(expDate.getDate() + 60);
        expiryStr = format(expDate, 'yyyy-MM-dd');
      }
    }

    if (expiryStr) {
      const expTs = parseDateToTimestamp(expiryStr);
      if (expTs > 0) {
        const expDate = new Date(expTs);
        const daysLeft = differenceInDays(expDate, todayStart);
        if (daysLeft >= 0 && daysLeft <= 10) {
          nearExpiryAlerts.push({
            id: latest.id,
            refId: latest.reference_id,
            name: latest.customer?.name || 'Unknown',
            category: latest.category,
            expiryDate: format(expDate, 'dd MMM yyyy'),
            daysLeft
          });
        }
      }
    }
  });

  // Calculations
  const grossProfit = totalReceiving - totalCost;
  const marginPercent = totalReceiving > 0 ? Math.round((grossProfit / totalReceiving) * 100) : 0;
  const collectionRate = totalRevenue > 0 ? Math.round((totalReceiving / totalRevenue) * 100) : 100;
  const abv = totalBookingsCount > 0 ? Math.round(totalRevenue / totalBookingsCount) : 0;

  // Chart Interval Timeline Data
  const intervalDays = eachDayOfInterval({
    start: range === 'all' 
      ? (allServices.length ? parseISO(getServiceDate(allServices[allServices.length - 1]) || format(subDays(now, 7), 'yyyy-MM-dd')) : subDays(now, 7)) 
      : startDate,
    end: now
  });

  const chartData = intervalDays.map(day => {
    const dKey = format(day, 'yyyy-MM-dd');
    return {
      name: format(day, 'dd MMM'),
      value: salesMap[dKey] || 0
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ── Executive Header ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-serif font-normal tracking-tight text-[#222222] dark:text-[#F5F4EF]">
              Executive Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
              Live UAE
            </span>
          </div>
          <p className="text-xs opacity-60 mt-1 font-mono">
            {format(now, 'EEEE, dd MMMM yyyy')} • Real-time performance & margin telemetry
          </p>
        </div>

        <DashboardFilters />
      </div>

      {/* ── 4-Card Hero KPI Bento Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Gross Sales */}
        <div className="card-anthropic p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5">
          <div>
            <div className="flex items-center justify-between opacity-60 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Gross Revenue</span>
              <DollarSign className="w-4 h-4 text-[#D97757]" />
            </div>
            <div className="text-2xl font-serif font-semibold text-[#222222] dark:text-[#F5F4EF]">
              {totalRevenue.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)] text-xs opacity-70 font-mono">
            <span>{totalBookingsCount} bookings</span>
            <span>ABV: {abv.toLocaleString()} AED</span>
          </div>
        </div>

        {/* KPI 2: Receiving Cashflow */}
        <div className="card-anthropic p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5">
          <div>
            <div className="flex items-center justify-between opacity-60 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Collected Receiving</span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-serif font-semibold text-blue-600 dark:text-blue-400">
              {totalReceiving.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)] text-xs opacity-70 font-mono">
            <span>Collection Rate</span>
            <span className="font-semibold">{collectionRate}%</span>
          </div>
        </div>

        {/* KPI 3: Direct Supplier Cost */}
        <div className="card-anthropic p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5">
          <div>
            <div className="flex items-center justify-between opacity-60 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Supplier / Airline Cost</span>
              <Plane className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-serif font-semibold text-amber-600 dark:text-amber-400">
              {totalCost.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)] text-xs opacity-70 font-mono">
            <span>Payable Direct Costs</span>
            <span className="opacity-80">Suppliers</span>
          </div>
        </div>

        {/* KPI 4: Net Gross Profit */}
        <div className="card-anthropic p-5 flex flex-col justify-between border border-emerald-500/20 bg-emerald-500/5 transition-all hover:-translate-y-0.5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300">
                Gross Profit
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {marginPercent}% Margin
              </span>
            </div>
            <div className={`text-2xl font-serif font-semibold ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {grossProfit.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">AED</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-500/20 text-xs opacity-75 font-mono text-emerald-900 dark:text-emerald-200">
            <span>Formula</span>
            <span>Receiving - Cost</span>
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Grid (Timeline + Category Mix) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Sales Timeline Chart */}
        <div className="lg:col-span-2 card-anthropic p-6">
          <SalesChart 
            data={chartData} 
            title="Revenue & Booking Timeline" 
            subtitle={`Daily sales velocity for ${range === 'today' ? 'today' : range.replace('-', ' ')}`}
          />
        </div>

        {/* Right 1/3: Service Mix Breakdown */}
        <div className="card-anthropic p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)] mb-4">
              <h3 className="text-base font-serif font-normal">Service Mix</h3>
              <span className="text-xs opacity-50 font-mono">{totalBookingsCount} Total</span>
            </div>

            <div className="space-y-4">
              {Object.entries(categoryDistribution).map(([categoryName, data]) => {
                const pct = totalRevenue > 0 ? Math.round((data.volume / totalRevenue) * 100) : 0;
                let icon = <Globe className="w-3.5 h-3.5" />;
                if (categoryName === 'UAE Visa') icon = <ShieldCheck className="w-3.5 h-3.5" />;
                if (categoryName === 'Air Tickets') icon = <Plane className="w-3.5 h-3.5" />;
                if (categoryName === 'Tour Packages') icon = <Compass className="w-3.5 h-3.5" />;

                return (
                  <div key={categoryName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        {icon}
                        {categoryName}
                      </span>
                      <div className="font-mono text-[11px] opacity-70">
                        <span>{data.volume.toLocaleString()} AED</span>
                        <span className="opacity-40 ml-1.5">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-[var(--sidebar-bg)] border border-[var(--card-border)]/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#D97757] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[var(--card-border)] flex items-center justify-between text-xs opacity-60 font-mono">
            <span>Customer Base</span>
            <span>{totalCustomersCount} Profiles</span>
          </div>
        </div>
      </div>

      {/* ── Operational Command Watchlist (Dual Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visa Expirations Watchlist */}
        <div className="card-anthropic overflow-hidden border border-blue-500/20">
          <div className="border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between bg-blue-500/5">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-serif font-medium">Visa Expirations Watchlist (Next 10 Days)</h3>
            </div>
            <span className="text-[10px] font-mono font-semibold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {nearExpiryAlerts.length} Critical
            </span>
          </div>

          <div className="divide-y divide-[var(--card-border)] max-h-[300px] overflow-y-auto">
            {nearExpiryAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-50 font-serif">
                No active visas expiring within the next 10 days.
              </div>
            ) : (
              nearExpiryAlerts.map((srv) => (
                <div key={srv.id} className="p-4 flex items-center justify-between hover:bg-[var(--sidebar-bg)] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm font-medium">{srv.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-500 text-white">
                        {srv.daysLeft === 0 ? 'Expires Today' : `${srv.daysLeft}d left`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-60 font-mono">
                      <span className="text-[#D97757] font-semibold">{srv.refId || '—'}</span>
                      <span>•</span>
                      <span>{srv.category}</span>
                      <span>•</span>
                      <span>Expires: {srv.expiryDate}</span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/uae-visa?search=${encodeURIComponent(srv.name)}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--sidebar-bg)] border border-[var(--card-border)] hover:border-[#D97757] transition-all"
                  >
                    Extend / Action
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Departure & A2A / Tour Reminders */}
        <VisaReminders reminders={departureReminders} />
      </div>

      {/* ── Financial Risk & Negative Margin Alerts (if any exist) ── */}
      {negativeProfitAlerts.length > 0 && (
        <div className="card-anthropic p-5 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-red-500/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-serif font-medium text-red-700 dark:text-red-300">
                Negative Margin Risks ({negativeProfitAlerts.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono opacity-60">Review pricing with suppliers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {negativeProfitAlerts.slice(0, 6).map((srv) => (
              <div key={srv.id} className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-xl text-xs">
                <div className="flex justify-between font-semibold">
                  <span>{srv.name}</span>
                  <span className="text-red-600 font-mono">{srv.margin.toLocaleString()} AED</span>
                </div>
                <div className="flex justify-between text-[10px] opacity-60 font-mono mt-1">
                  <span>{srv.category}</span>
                  <span>Sale: {srv.receiving} | Cost: {srv.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Invoices Table ── */}
      <div className="card-anthropic overflow-hidden">
        <div className="border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#D97757]" />
            <h3 className="text-base font-serif font-medium">Recent Invoice Ledger</h3>
          </div>
          <Link href="/dashboard/invoices" className="text-xs font-medium text-[#D97757] hover:underline flex items-center gap-1">
            View All Invoices <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-[10px] uppercase tracking-wider opacity-70 font-mono">
              <tr>
                <th className="px-6 py-3 font-medium">Invoice Number</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Payment Mode</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-right font-medium">Date</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--sidebar-bg)] transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold text-[#D97757]">
                    {inv.invoice_number}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-xs">
                    {inv.customer?.name || 'Walk-in Client'}
                  </td>
                  <td className="px-6 py-3.5 text-xs opacity-70">
                    {inv.payment_method || 'Bank Transfer'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-xs font-semibold">
                    {Number(inv.total_amount || 0).toLocaleString()} AED
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-xs opacity-60">
                    {inv.date || (inv.created_at ? format(parseISO(inv.created_at), 'dd MMM yyyy') : '—')}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="text-xs text-[#D97757] hover:underline font-mono"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center opacity-50 text-xs font-serif">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
