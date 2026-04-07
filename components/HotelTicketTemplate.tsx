import React, { forwardRef } from 'react';

export type HotelBookingData = {
  bookingId: string;
  bookingDate: string;
  hotelName: string;
  hotelAddress: string;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  noOfRooms: number;
  roomTypeBoard: string;
  guestName: string;
  adults: number;
  children: number;
  infants: number;
};

type Props = {
  data: HotelBookingData;
};

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-blue-500 flex-shrink-0">
    <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 11H21" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="7" y="14" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="11" y="14" width="2" height="2" rx="0.5" fill="currentColor"/>
  </svg>
);

const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-blue-500 flex-shrink-0">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-blue-500 flex-shrink-0">
    <path d="M3 21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 21V5C5 4.44772 5.44772 4 6 4H18C18.5523 4 19 4.44772 19 5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 16H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const HotelTicketTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-[#f0f2f5] text-black w-[900px] min-h-[600px] mx-auto box-border pt-8 pb-12 px-10"
      style={{
        fontFamily: "'Inter', 'Segoe UI', 'Arial', sans-serif",
        lineHeight: '1.4',
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between font-bold text-[13px] mb-6 px-1">
        <div>Booking Date: <span className="font-normal ml-1">{data.bookingDate}</span></div>
        <div>Booking ID: <span className="font-normal ml-1">{data.bookingId}</span></div>
      </div>

      {/* CARD 1: HOTEL INFO */}
      <div className="bg-white rounded-xl border border-gray-300 p-6 mb-6">
        <div className="flex gap-6 mb-6">
          <img 
            src="/hotelbooking/hotel-placeholder.png" 
            alt="Hotel" 
            className="w-[200px] h-[130px] object-cover rounded-lg shadow-sm border border-gray-100"
          />
          <div className="flex-1 pt-2">
            <h2 className="text-[18px] font-bold text-gray-900 mb-2">{data.hotelName}</h2>
            <p className="text-[13px] text-gray-600 max-w-[300px] leading-relaxed">{data.hotelAddress}</p>
          </div>
          <div className="flex-shrink-0 pt-1">
             <img 
               src="/hotelbooking/qr-placeholder.png" 
               alt="QR Code" 
               className="w-[110px] h-[110px] object-contain"
             />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 w-full mb-6 relative">
          <div className="absolute top-[-6px] left-[-24px] w-3 h-3 rounded-full bg-[#f0f2f5] border-r border-gray-200"></div>
          <div className="absolute top-[-6px] right-[-24px] w-3 h-3 rounded-full bg-[#f0f2f5] border-l border-gray-200"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 pl-2">
          <div className="flex">
             <IconCalendar />
             <div className="flex flex-col">
                <span className="text-[12px] text-gray-500 font-medium">Check in:</span>
                <span className="text-[15px] font-bold text-gray-900">{data.checkIn}</span>
             </div>
          </div>
          <div className="flex">
             <IconCalendar />
             <div className="flex flex-col">
                <span className="text-[12px] text-gray-500 font-medium">Check out:</span>
                <span className="text-[15px] font-bold text-gray-900">{data.checkOut}</span>
             </div>
          </div>
          <div className="flex">
             <IconMoon />
             <div className="flex flex-col">
                <span className="text-[12px] text-gray-500 font-medium">Total Night(s):</span>
                <span className="text-[15px] font-bold text-gray-900">{data.totalNights}</span>
             </div>
          </div>
          <div className="flex">
             <IconBuilding />
             <div className="flex flex-col">
                <span className="text-[12px] text-gray-500 font-medium">No. Of Rooms</span>
                <span className="text-[15px] font-bold text-gray-900">{data.noOfRooms}</span>
             </div>
          </div>
        </div>
      </div>

      {/* CARD 2: GUEST DETAILS */}
      <div className="bg-white rounded-lg border border-gray-300 mb-6 overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_1fr_80px_80px_80px] text-[13px] font-bold bg-[#edf3fd] border-b border-gray-300 py-3 px-5">
           <div>No.</div>
           <div>Room Type/ Board</div>
           <div>Guest Name</div>
           <div className="text-center">Adults</div>
           <div className="text-center">Children</div>
           <div className="text-center">Infant</div>
        </div>
        <div className="grid grid-cols-[60px_1fr_1fr_80px_80px_80px] text-[13px] py-4 px-5 items-center">
           <div className="text-gray-700">1</div>
           <div className="text-gray-900">{data.roomTypeBoard}</div>
           <div className="font-bold text-blue-500 uppercase">{data.guestName}</div>
           <div className="text-center text-gray-700">{data.adults}</div>
           <div className="text-center text-gray-700">{data.children}</div>
           <div className="text-center text-gray-700">{data.infants}</div>
        </div>
      </div>

      {/* CARD 3: POLICIES */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="bg-[#edf3fd] px-5 py-3 border-b border-gray-300">
          <h3 className="font-bold text-[13px] text-gray-900 text-left">Check-In/Check-Out Timings & Other Policies :</h3>
        </div>
        <div className="p-6 text-[12.5px] text-gray-600 leading-[1.8]">
           <ul className="space-y-4">
              <li className="flex gap-2 relative pl-3">
                 <span className="absolute left-0 top-2 w-[4px] h-[4px] rounded-full bg-gray-400"></span>
                 The usual check-in time at the hotel is 14:00 hours, however timings may vary for each hotel, kindly verify the same with the hotel directly or our team can assist you with any specific query you may have. The rooms may not be available for early check-in, unless specifically requested in advance through email, which is subject to availability.
              </li>
              <li className="flex gap-2 relative pl-3">
                 <span className="absolute left-0 top-2 w-[4px] h-[4px] rounded-full bg-gray-400"></span>
                 Kindly note that on the day of check-in the said reservation will be cancelled automatically after 18:00 hours (local time) or earlier, if the hotel is not informed about the late arrival of the guest(s).
              </li>
              <li className="flex gap-2 relative pl-3">
                 <span className="absolute left-0 top-2 w-[4px] h-[4px] rounded-full bg-gray-400"></span>
                 The usual check-out time from the hotel is 12:00 hours, however timings may vary for each hotel, kindly verify the same with the hotel directly or our team can assist you with any specific query you may have. Late checkout may involve additional charges. Please advise your clients to check with the hotel reception in advance.
              </li>
              <li className="flex gap-2 relative pl-3">
                 <span className="absolute left-0 top-2 w-[4px] h-[4px] rounded-full bg-gray-400"></span>
                 This is computer generated confirmation letter and your client will have to produce a valid voucher in order to exchange the same at the property for your stay. In the event you have cancelled the said reservation post-printing this letter, your accommodation will get automatically cancelled and this letter will not entitle your client, a stay at the said hotel.
              </li>
           </ul>
        </div>
      </div>

    </div>
  );
});

HotelTicketTemplate.displayName = 'HotelTicketTemplate';

export default HotelTicketTemplate;
