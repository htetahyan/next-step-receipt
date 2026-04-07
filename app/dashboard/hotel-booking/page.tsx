import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Building } from 'lucide-react'
import HotelBookingList from '@/components/HotelBookingList'

export default async function HotelBookingPage() {
  const supabase = await createClient()

  const { data: bookings, error } = await supabase
    .from('hotel_bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching hotel bookings:', error)
  }

  // Mobile layout
  const MobileList = () => (
    <div className="grid grid-cols-1 gap-4 sm:hidden">
      {bookings?.map((booking) => (
        <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-2">{booking.booking_id}</span>
            </div>
            <Link 
              href={`/dashboard/hotel-booking/${booking.id}`}
              className="text-blue-600 font-medium text-sm"
            >
              View
            </Link>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{booking.guest_name}</p>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <Building className="w-6 h-6 text-blue-600" />
             Hotel Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage your hotel booking vouchers</p>
        </div>
        
        <Link 
          href="/dashboard/hotel-booking/new" 
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Create Booking
        </Link>
      </div>

      <HotelBookingList bookings={bookings || []} />
      <MobileList />
    </div>
  )
}
