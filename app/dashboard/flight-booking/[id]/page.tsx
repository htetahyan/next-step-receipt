import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { FlightBookingData } from '@/components/FlightTicketTemplate';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import FlightBookingActions from '@/components/FlightBookingActions';

export default async function FlightBookingViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from('flight_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) {
    notFound();
  }

  const bookingData: FlightBookingData = {
    pnr: booking.pnr,
    issueDate: booking.issue_date,
    passengerTitle: booking.passenger_title,
    passengerName: (booking.passenger_name || '').toUpperCase(),
    tripType: booking.trip_type || 'round',
    cabin: booking.cabin,
    fareType: booking.fare_type,
    checkinBaggage: booking.checkin_baggage,
    cabinBaggage: booking.cabin_baggage,
    onwardFlight: {
      date: booking.onward_flight?.date || '',
      departureTime: booking.onward_flight?.departureTime || '',
      arrivalTime: booking.onward_flight?.arrivalTime || '',
      duration: booking.onward_flight?.duration || '',
      fromCity: booking.onward_flight?.fromCity || '',
      fromAirport: booking.onward_flight?.fromAirport || '',
      fromCode: booking.onward_flight?.fromCode || '',
      toCity: booking.onward_flight?.toCity || '',
      toAirport: booking.onward_flight?.toAirport || '',
      toCode: booking.onward_flight?.toCode || '',
    },
    returnFlight: {
      date: booking.return_flight?.date || '',
      departureTime: booking.return_flight?.departureTime || '',
      arrivalTime: booking.return_flight?.arrivalTime || '',
      duration: booking.return_flight?.duration || '',
      fromCity: booking.return_flight?.fromCity || '',
      fromAirport: booking.return_flight?.fromAirport || '',
      fromCode: booking.return_flight?.fromCode || '',
      toCity: booking.return_flight?.toCity || '',
      toAirport: booking.return_flight?.toAirport || '',
      toCode: booking.return_flight?.toCode || '',
    },
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link 
          href="/dashboard/flight-booking"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider"
        >
          <ChevronLeft className="h-4 w-4" />
          Directory / Flight Bookings
        </Link>

        {/* Quick Hotel Link */}
        <Link 
          href={`/dashboard/hotel-booking/new?guestName=${encodeURIComponent(bookingData.passengerTitle + (bookingData.passengerName || '').toUpperCase())}&checkIn=${bookingData.onwardFlight.date}&checkOut=${bookingData.returnFlight?.date || ''}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
        >
          🏢 Create Hotel Booking
        </Link>
      </div>

      <FlightBookingActions data={bookingData} />
    </div>
  );
}
