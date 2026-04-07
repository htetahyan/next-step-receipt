'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteFlightBooking(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('flight_bookings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting flight booking:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/flight-booking')
  return { message: 'Flight booking deleted successfully' }
}
