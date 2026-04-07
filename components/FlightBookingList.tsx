'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import { Eye, Trash2, Plane } from 'lucide-react'
import { deleteFlightBooking } from '@/app/actions/flight-bookings'

type FlightBooking = {
  id: string
  pnr: string
  passenger_name: string
  issue_date: string
  cabin: string
  trip_type: string
}

export default function FlightBookingList({ bookings }: { bookings: FlightBooking[] }) {
  const handleDelete = async (id: string, pnr: string) => {
    if (window.confirm(`Are you sure you want to delete booking ${pnr}?`)) {
      await deleteFlightBooking(id)
    }
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <Plane className="w-12 h-12 text-slate-300 mb-4 dark:text-slate-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Flight Bookings</h3>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-sm dark:text-slate-400">
          You haven't created any flight bookings yet. Click the button below to create your first one.
        </p>
        <Link 
          href="/dashboard/flight-booking/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all shadow-blue-600/20"
        >
          <Plane className="w-4 h-4" />
          Create Flight Booking
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 hidden sm:block">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-6 py-4 font-semibold">PNR</th>
            <th className="px-6 py-4 font-semibold">Passenger</th>
            <th className="px-6 py-4 font-semibold">Issue Date</th>
            <th className="px-6 py-4 font-semibold">Cabin</th>
            <th className="px-6 py-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4">
                <span className="font-bold text-slate-900 dark:text-white">{booking.pnr}</span>
                <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50 uppercase">
                  {booking.trip_type}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                {booking.passenger_name}
              </td>
              <td className="px-6 py-4 text-slate-500">
                {format(new Date(booking.issue_date), 'dd MMM yyyy')}
              </td>
              <td className="px-6 py-4">
                 <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                   {booking.cabin}
                 </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/dashboard/flight-booking/${booking.id}`}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                    title="View Booking"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(booking.id, booking.pnr)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Delete Booking"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
