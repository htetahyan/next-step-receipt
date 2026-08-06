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
      .select('id, category, status, details, created_at')
      .not('status', 'in', '(Closed,Cancelled)');

    if (error) return { closed: 0, error: error.message };
    if (!services || services.length === 0) return { closed: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toCloseIds: string[] = [];

    for (const service of services) {
      const details = (service.details as any) || {};
      let isExpired = false;

      // Determine if this is a visa service (not ticket or hotel)
      const category = (service.category || '').toLowerCase();
      const ref = (service.reference_id || '').toLowerCase();
      const isTicketOrHotel = 
        category.includes('ticket') || 
        category.includes('flight') || 
        category.includes('way') || 
        category.includes('trip') || 
        category.includes('hotel') || 
        ref.startsWith('at') || 
        ref.startsWith('tk') || 
        ref.startsWith('hb');
      
      const isVisa = !isTicketOrHotel;
      if (!isVisa) continue;

      // Method 1: explicit visa_expiry_date in the past
      if (details.visa_expiry_date) {
        const expDate = new Date(details.visa_expiry_date);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          if (expDate < today) isExpired = true;
        }
      }

      // Method 2: No expiry date but has travel_date or visa_issued_date → guess expiry date by adding 2 months (60 days)
      if (!isExpired && !details.visa_expiry_date) {
        const baseDateStr = details.travel_date || details.visa_issued_date;
        if (baseDateStr) {
          const baseDate = new Date(baseDateStr);
          if (!isNaN(baseDate.getTime())) {
            const calculatedExpiry = new Date(baseDate);
            calculatedExpiry.setDate(calculatedExpiry.getDate() + 60); // 2 months = 60 days
            calculatedExpiry.setHours(0, 0, 0, 0);
            if (calculatedExpiry < today) isExpired = true;
          }
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
