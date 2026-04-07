'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteHotelBooking(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('hotel_bookings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting hotel booking:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/hotel-booking')
  return { message: 'Hotel booking deleted successfully' }
}
