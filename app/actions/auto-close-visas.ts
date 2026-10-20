'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { isUaeVisaCategory } from '@/lib/service-constants';
import { calculateVisaExpiryDate, getVisaBaseDateISO, toISODate } from '@/lib/serviceDates';
import { requirePermission } from '@/app/actions/users';

/**
 * Auto-close expired visas server action.
 * Uses the authenticated Supabase server client (bypasses RLS correctly).
 * Logic: Close visas where visa_expiry_date is in the past,
 *        OR (travel_date || visa_issued_date) + visa_duration days is in the past.
 */
export async function autoCloseExpiredVisas(): Promise<{ closed: number; error?: string }> {
  try {
    await requirePermission('uae_visa', 'edit');
    const supabase = await createClient();

    // Fetch all open visa services
    const { data: services, error } = await supabase
      .from('customer_services')
      .select('id, reference_id, category, status, details, created_at')
      .not('status', 'in', '(Closed,Cancelled)');

    if (error) return { closed: 0, error: error.message };
    if (!services || services.length === 0) return { closed: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toCloseIds: string[] = [];

    for (const service of services) {
      const details = (service.details as any) || {};
      let isExpired = false;

      if (!isUaeVisaCategory(service.category, (service as any).reference_id)) continue;

      const resolvedExpiry =
        toISODate(details.visa_expiry_date) ||
        calculateVisaExpiryDate(getVisaBaseDateISO(details), details.visa_duration, service.category);

      if (resolvedExpiry) {
        const expDate = new Date(resolvedExpiry);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          if (expDate < today) isExpired = true;
        }
      }

      if (isExpired) toCloseIds.push(service.id);
    }

    if (toCloseIds.length === 0) return { closed: 0 };

    // Batch update all expired visas to Closed
    const { error: updateError } = await supabase
      .from('customer_services')
      .update({ status: 'Closed' })
      .in('id', toCloseIds);

    if (updateError) return { closed: 0, error: updateError.message };

    revalidatePath('/dashboard/uae-visa');
    revalidatePath('/dashboard/other-visa');
    revalidatePath('/dashboard');

    return { closed: toCloseIds.length };
  } catch (err: any) {
    return { closed: 0, error: err.message };
  }
}
