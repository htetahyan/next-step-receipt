'use server';

import { createClient } from '@/utils/supabase/server';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { serviceMatchesDateRange } from '@/lib/serviceDates';

const REPORT_SERVICE_SELECT =
  'id, customer_id, reference_id, category, status, details, financials, created_at, customer:customers(id, name, passport_no)';

export async function fetchMonthlySalesReportServices(monthYYYYMM?: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] as any[] };
    }

    const now = new Date();
    const targetMonth = monthYYYYMM || format(now, 'yyyy-MM');
    const [yyyyStr, mmStr] = targetMonth.split('-');
    const yearNum = parseInt(yyyyStr, 10) || now.getFullYear();
    const monthIndex = (parseInt(mmStr, 10) || now.getMonth() + 1) - 1;

    const startDate = startOfMonth(new Date(yearNum, monthIndex, 1));
    const endDate = endOfMonth(startDate);

    const startISO = format(startDate, 'yyyy-MM-dd');
    const endISO = format(endDate, 'yyyy-MM-dd');

    // Fetch window around the target month so records entered slightly earlier/later
    // whose visa_issued_date falls inside the month are always captured.
    const fetchFrom = new Date(startDate.getTime());
    fetchFrom.setMonth(fetchFrom.getMonth() - 6);
    const fetchUntil = new Date(endDate.getTime());
    fetchUntil.setMonth(fetchUntil.getMonth() + 6);

    const { data, error } = await supabase
      .from('customer_services')
      .select(REPORT_SERVICE_SELECT)
      .is('deleted_at', null)
      .gte('created_at', fetchFrom.toISOString())
      .lte('created_at', fetchUntil.toISOString())
      .order('created_at', { ascending: false })
      .limit(1200);

    if (error) {
      console.error('Error fetching monthly sales report services:', error);
      return { success: false, error: error.message, data: [] as any[] };
    }

    const matched = (data || []).filter((srv: any) => serviceMatchesDateRange(srv, startISO, endISO));

    return {
      success: true,
      data: matched,
      month: targetMonth,
    };
  } catch (err: any) {
    console.error('fetchMonthlySalesReportServices exception:', err);
    return {
      success: false,
      error: err?.message || 'Failed to generate monthly sales report',
      data: [] as any[],
    };
  }
}
