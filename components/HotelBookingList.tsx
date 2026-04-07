'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import { Eye, Trash2, Building } from 'lucide-react'
import { deleteHotelBooking } from '@/app/actions/hotel-bookings'

type HotelBooking = {
  id: string
  booking_id: string
  guest_name: string
  booking_date: string
  hotel_name: string
}

export default function HotelBookingList({ bookings }: { bookings: HotelBooking[] }) {
  const handleDelete = async (id: string, booking_id: string) => {
    if (window.confirm(`Are you sure you want to delete booking ${booking_id}?`)) {
      await deleteHotelBooking(id)
    }
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <Building className="w-12 h-12 text-slate-300 mb-4 dark:text-slate-600" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Hotel Bookings</h3>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-sm dark:text-slate-400">
          You haven't created any hotel bookings yet. Click the button below to create your first one.
        </p>
        <Link 
          href="/dashboard/hotel-booking/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all shadow-blue-600/20"
        >
          <Building className="w-4 h-4" />
          Create Hotel Booking
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 hidden sm:block">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-6 py-4 font-semibold">Booking ID</th>
            <th className="px-6 py-4 font-semibold">Guest</th>
            <th className="px-6 py-4 font-semibold">Booking Date</th>
            <th className="px-6 py-4 font-semibold">Hotel</th>
            <th className="px-6 py-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4">
                <span className="font-bold text-slate-900 dark:text-white">{booking.booking_id}</span>
              </td>
              <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                {booking.guest_name}
              </td>
              <td className="px-6 py-4 text-slate-500">
                {format(new Date(booking.booking_date), 'dd MMM yyyy')}
              </td>
              <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                {booking.hotel_name}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/dashboard/hotel-booking/${booking.id}`}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                    title="View Booking"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(booking.id, booking.booking_id)}
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
