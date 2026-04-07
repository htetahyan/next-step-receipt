import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { HotelBookingData } from '@/components/HotelTicketTemplate';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import HotelBookingActions from '@/components/HotelBookingActions';

export default async function HotelBookingViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) {
    notFound();
  }

  const bookingData: HotelBookingData = {
    bookingId: booking.booking_id,
    bookingDate: booking.booking_date,
    hotelName: booking.hotel_name,
    hotelAddress: booking.hotel_address,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    totalNights: booking.total_nights,
    noOfRooms: booking.no_of_rooms,
    roomTypeBoard: booking.room_type_board,
    guestName: booking.guest_name,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link 
          href="/dashboard/hotel-booking"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider"
        >
          <ChevronLeft className="h-4 w-4" />
          Directory / Hotel Bookings
        </Link>
      </div>

      <HotelBookingActions data={bookingData} />
    </div>
  );
}
