import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Plane } from 'lucide-react'
import FlightBookingList from '@/components/FlightBookingList'

export default async function FlightBookingPage() {
  const supabase = await createClient()

  const { data: bookings, error } = await supabase
    .from('flight_bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // Mobile layout
  const MobileList = () => (
    <div className="grid grid-cols-1 gap-4 sm:hidden">
      {bookings?.map((booking) => (
        <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-2">{booking.pnr}</span>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50 uppercase">
                 {booking.trip_type || 'round'}
              </span>
            </div>
            <Link 
              href={`/dashboard/flight-booking/${booking.id}`}
              className="text-blue-600 font-medium text-sm"
            >
              View
            </Link>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{booking.passenger_name}</p>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <Plane className="w-6 h-6 text-blue-600" />
             Flight Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage your flight dummy tickets</p>
        </div>
        
        <Link 
          href="/dashboard/flight-booking/new" 
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Create Booking
        </Link>
      </div>

      <FlightBookingList bookings={bookings || []} />
      <MobileList />
    </div>
  )
}
