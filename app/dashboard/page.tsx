import { createClient } from '@/utils/supabase/server'
import { DollarSign, FileText, TrendingUp, Users } from 'lucide-react'
import SalesChart from '@/components/SalesChart'
import DateRangeFilter from '@/components/DateRangeFilter'
import { subDays, startOfDay, format, isAfter, parseISO, eachDayOfInterval } from 'date-fns'

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = '7d' } = await searchParams;
  const supabase = await createClient()

  let metrics = {
    totalRevenue: 0,
    invoicesCount: 0,
    activeCustomers: 0,
    recentInvoices: [] as any[]
  };

  let chartData: { name: string; value: number }[] = [];

  try {
    const { data: allInvoices, error: invError } = await supabase
      .from('invoices')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false });

    if (!invError && allInvoices) {
      const now = new Date();
      let startDate: Date;
      
      switch (range) {
        case 'today': startDate = startOfDay(now); break;
        case '7d': startDate = subDays(now, 7); break;
        case '30d': startDate = subDays(now, 30); break;
        case '90d': startDate = subDays(now, 90); break;
        default: startDate = subDays(now, 7);
      }

      // 1. Filter Invoices
      const filteredInvoices = (range === 'all' 
        ? allInvoices 
        : allInvoices.filter((inv: any) => isAfter(parseISO(inv.created_at), startDate))) as any[];

      // 2. Aggregate Highlights
      const { count: custCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      const totalRevenue = filteredInvoices.reduce((acc: number, inv: any) => acc + Number(inv.total_amount), 0);

      metrics = {
        totalRevenue,
        invoicesCount: filteredInvoices.length,
        activeCustomers: custCount || 0,
        recentInvoices: filteredInvoices.slice(0, 10)
      };

      // 3. Aggregate for Chart (Gap Filling)
      const intervalDays = eachDayOfInterval({
        start: range === 'all' ? (filteredInvoices.length ? parseISO(filteredInvoices[filteredInvoices.length-1].created_at) : startDate) : startDate,
        end: now
      });

      // Map existing invoices to a Daily Map
      const salesMap: Record<string, number> = {};
      filteredInvoices.forEach(inv => {
        const d = format(parseISO(inv.created_at), 'yyyy-MM-dd');
        salesMap[d] = (salesMap[d] || 0) + Number(inv.total_amount);
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

  const stats = [
    { name: 'Total Revenue', value: `${metrics.totalRevenue.toLocaleString()} AED`, icon: DollarSign, change: '+12%', color: 'emerald' },
    { name: 'Filtered Invoices', value: metrics.invoicesCount, icon: FileText, change: '+4.5%', color: 'emerald' },
    { name: 'Directory Size', value: metrics.activeCustomers, icon: Users, change: '+2', color: 'emerald' },
    { name: 'Growth', value: '24%', icon: TrendingUp, change: '+4.1%', color: 'emerald' },
  ]

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Analytics Dashboard</h1>
          <p className="text-slate-500 font-medium tracking-tight">Daily performance tracking for NextStep Travel & Tourism.</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#1e293b] dark:bg-[#0f172a] transition-all hover:shadow-lg hover:border-emerald-500/20 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{stat.name}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20 group-hover:bg-emerald-500 group-hover:text-white transition-all text-emerald-600">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sales Graph */}
      <div className="grid grid-cols-1">
         <SalesChart data={chartData} />
      </div>

      <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#1e293b] dark:bg-[#0f172a] overflow-hidden">
        <div className="border-b border-[#e2e8f0] px-8 py-6 dark:border-[#1e293b] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-lg font-black leading-6 text-slate-900 dark:text-white uppercase tracking-tighter">Recent Activities</h3>
          <span className="text-xs font-bold text-emerald-600 tracking-widest uppercase bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">Active Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-600 font-black dark:border-slate-800 dark:text-slate-500">
              <tr>
                <th scope="col" className="px-8 py-5">Invoice NO.</th>
                <th scope="col" className="px-8 py-5">Client Name</th>
                <th scope="col" className="px-8 py-5 text-right">Amount (AED)</th>
                <th scope="col" className="px-8 py-5 text-right">Issue Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.recentInvoices.map((invoice: any) => (
                <tr key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                  <th scope="row" className="whitespace-nowrap px-8 py-5 font-bold text-slate-900 dark:text-white">
                    {invoice.invoice_number}
                  </th>
                  <td className="px-8 py-5 font-medium">{invoice.customer?.name}</td>
                  <td className="px-8 py-5 font-black text-slate-900 dark:text-white text-right">
                    {Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-5 text-right font-medium">{invoice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
