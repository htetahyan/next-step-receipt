import { createClient } from '@/utils/supabase/server';
import { dashboardServiceGroup } from '@/lib/service-constants';

export const SERVICE_LIST_SELECT =
  'id, reference_id, customer_id, category, status, details, financials, created_at, customers(id, name, passport_no, phone)';

export type ListFilter = {
  inCategories?: string[];
  notInCategories?: string[];
  allTime?: boolean;
};

function applyCategoryFilter(query: any, filter: ListFilter) {
  if (filter.inCategories?.length) {
    return query.in('category', filter.inCategories);
  }
  if (filter.notInCategories?.length) {
    return query.not('category', 'in', `("${filter.notInCategories.join('","')}")`);
  }
  return query;
}

/**
 * Load the working set for module lists: every Open/In Progress record
 * plus the last 120 days (capped). Historical closed rows are pulled on
 * demand via searchServices when the user types.
 */
export async function fetchModuleServiceList(filter: ListFilter = {}) {
  const supabase = await createClient();

  if (filter.allTime) {
    const allQuery = applyCategoryFilter(
      supabase
        .from('customer_services')
        .select(SERVICE_LIST_SELECT)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1000),
      filter
    );
    const { data } = await allQuery;
    return data || [];
  }

  const since = new Date();
  since.setDate(since.getDate() - 120);

  const activeQuery = applyCategoryFilter(
    supabase
      .from('customer_services')
      .select(SERVICE_LIST_SELECT)
      .is('deleted_at', null)
      .in('status', ['Open', 'In Progress'])
      .order('created_at', { ascending: false }),
    filter
  );

  const recentQuery = applyCategoryFilter(
    supabase
      .from('customer_services')
      .select(SERVICE_LIST_SELECT)
      .is('deleted_at', null)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(400),
    filter
  );

  const [activeRes, recentRes] = await Promise.all([activeQuery, recentQuery]);

  const merged = new Map<string, any>();
  for (const row of [...(activeRes.data || []), ...(recentRes.data || [])]) {
    merged.set(row.id, row);
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function fetchMatchingCategories(patterns: string[], extraOr: string[] = []): Promise<any[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_services')
    .select(SERVICE_LIST_SELECT)
    .is('deleted_at', null)
    .or([...patterns.map((pattern) => `category.ilike.%${pattern}%`), ...extraOr].join(','))
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

export async function fetchAirTicketServices() {
  const rows = await fetchMatchingCategories(
    ['ticket', 'flight', 'airline'],
    ['reference_id.ilike.AT*', 'reference_id.ilike.TK*']
  );
  return rows.filter((row: any) => dashboardServiceGroup(row.category, row.reference_id) === 'Air Tickets');
}

export async function fetchTourPackageServices() {
  const rows = await fetchMatchingCategories(['tour', 'safari', 'package', 'hotel']);
  return rows.filter((row: any) => dashboardServiceGroup(row.category, row.reference_id) === 'Tour Packages');
}

export async function fetchCustomServices() {
  const rows = await fetchModuleServiceList({ allTime: true });
  return rows.filter((row: any) => dashboardServiceGroup(row.category, row.reference_id) === 'Custom Service');
}

/** Other-country visas only. Names like "Japan" or "Schengen Visa" are included. Tickets, tours, and UAE visas are removed. */
export async function fetchOtherCountryVisas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_services')
    .select(SERVICE_LIST_SELECT)
    .is('deleted_at', null)
    .or(
      [
        'category.ilike.%schengen%',
        'category.ilike.%japan%',
        'category.ilike.%china%',
        'category.ilike.%korea%',
        'category.ilike.%armenia%',
        'category.ilike.%uk%',
        'category.ilike.%britain%',
        'category.ilike.%consultation%',
        'category.ilike.%other country%',
        'category.ilike.%usa%',
        'category.ilike.%canada%',
        'category.ilike.%australia%',
        'category.ilike.%europe%',
      ].join(',')
    )
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data || []).filter((row: any) => dashboardServiceGroup(row.category, row.reference_id) === 'Other Visas');
}
