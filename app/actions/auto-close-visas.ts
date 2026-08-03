'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Auto-close expired visas server action.
 * Uses the authenticated Supabase server client (bypasses RLS correctly).
 * Logic: Close visas where visa_expiry_date is in the past,
 *        OR travel_date + visa_duration days is in the past.
 */
export async function autoCloseExpiredVisas(): Promise<{ closed: number; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { closed: 0, error: 'Not authenticated' };

    // Fetch all open visa services
    const { data: services, error } = await supabase
      .from('customer_services')
      .select('id, category, status, details')
      .not('status', 'in', '(Closed,Cancelled)');

    if (error) return { closed: 0, error: error.message };
    if (!services || services.length === 0) return { closed: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toCloseIds: string[] = [];

    for (const service of services) {
      const category = (service.category || '').toLowerCase();

      // Only process visa-related records
      const isVisa = category.includes('visa') || category.includes('extension') || category.includes('inside visa');
      if (!isVisa) continue;

      const details = (service.details as any) || {};
      let isExpired = false;

      // Method 1: explicit visa_expiry_date
      if (details.visa_expiry_date) {
        const expDate = new Date(details.visa_expiry_date);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          if (expDate < today) isExpired = true;
        }
      }

      // Method 2: travel_date + visa_duration (fallback)
      if (!isExpired && details.travel_date) {
        const travelDate = new Date(details.travel_date);
        if (!isNaN(travelDate.getTime())) {
          // visa_duration may be "60 Days", "30 Days", or a number
          const durationRaw = details.visa_duration_days || details.visa_duration || '60';
          const duration = parseInt(String(durationRaw)) || 60;
          const expDate = new Date(travelDate);
          expDate.setDate(expDate.getDate() + duration);
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
