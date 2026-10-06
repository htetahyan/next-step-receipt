'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/app/actions/users'
import { signPortalToken } from '@/lib/portal-token'
import { getSiteUrl } from '@/lib/site-url'

export async function getPublicInvoiceUrl(invoiceId: string) {
  try {
    await requirePermission('invoices', 'read');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('id, customer_id')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.customer_id) return { error: 'This invoice is not linked to a customer.' };
    const token = signPortalToken(data.customer_id);
    if (!token) return { error: 'Portal signing secret is not configured.' };
    return {
      url: `${getSiteUrl()}/portal/${data.customer_id}/invoice/${data.id}?t=${encodeURIComponent(token)}`,
    };
  } catch (err: any) {
    return { error: err.message || 'Could not create a public invoice link.' };
  }
}

export async function deleteInvoice(id: string) {
  try {
    await requirePermission('invoices', 'delete');
  } catch (err: any) {
    return { error: err.message };
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting invoice:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/invoices')
  return { message: 'Invoice deleted successfully' }
}
