'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteInvoice(id: string) {
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
