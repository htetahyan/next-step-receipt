import { createClient } from '@/utils/supabase/server';

export const SERVICE_LIST_SELECT =
  'id, reference_id, customer_id, category, status, details, financials, created_at, customers!inner(id, name, passport_no, phone)';

type ListFilter = {
  inCategories?: string[];
  notInCategories?: string[];
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
  const since = new Date();
  since.setDate(since.getDate() - 120);

  const activeQuery = applyCategoryFilter(
    supabase
      .from('customer_services')
      .select(SERVICE_LIST_SELECT)
      .in('status', ['Open', 'In Progress'])
      .order('created_at', { ascending: false }),
    filter
  );

  const recentQuery = applyCategoryFilter(
    supabase
      .from('customer_services')
      .select(SERVICE_LIST_SELECT)
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
