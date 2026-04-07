import React, { forwardRef } from 'react';

export type FlightLeg = {
  date: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  fromCity: string;
  fromAirport: string;
  fromCode: string;
  toCity: string;
  toAirport: string;
  toCode: string;
};

export type FlightBookingData = {
  pnr: string;
  issueDate: string;
  passengerTitle: string;
  passengerName: string;
  tripType: 'onward' | 'return' | 'round';
  onwardFlight: FlightLeg;
  returnFlight: FlightLeg;
  cabin: string;
  fareType: string;
  checkinBaggage: string;
  cabinBaggage: string;
};

type Props = {
  data: FlightBookingData;
};

function formatFlightDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${days[d.getDay()]}`;
  } catch {
    return dateStr;
  }
}

function formatIssueDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

const IconPlane = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M14 8.5L21.5 10C22.3284 10.1657 23 10.8343 23 11.6627C23 11.849 22.849 12 22.6627 12H18.5L14 15V19Z" fill="#3B82F6"/>
    <path d="M3 10.5L9.5 9L15 4.5L16.5 4L15.5 6.5L10 11.5L4.5 13L3 14V10.5Z" fill="#3B82F6"/>
    <path d="M2 19C2.5 18.5 3.5 18 5 18C6.5 18 7.5 18.5 8 19C8.5 19.5 9.5 20 11 20C12.5 20 13.5 19.5 14 19C14.5 18.5 15.5 18 17 18C18.5 18 19.5 18.5 20 19C20.5 19.5 21.5 20 23 20" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 22C2.5 21.5 3.5 21 5 21C6.5 21 7.5 21.5 8 22C8.5 22.5 9.5 23 11 23C12.5 23 13.5 22.5 14 22C14.5 21.5 15.5 21 17 21C18.5 21 19.5 21.5 20 22" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPassport = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="#4B5563" strokeWidth="1.5"/>
    <path d="M7 10H11" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 14H17" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="13" y="8" width="4" height="4" stroke="#4B5563" strokeWidth="1.5"/>
  </svg>
);

const IconDocument = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <rect x="5" y="3" width="14" height="18" rx="2" stroke="#4B5563" strokeWidth="1.5"/>
    <path d="M9 8H15" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 12H15" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 16H13" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconId = () => (
   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="#4B5563" strokeWidth="1.5"/>
      <circle cx="8" cy="12" r="2" stroke="#4B5563" strokeWidth="1.5"/>
      <path d="M13 10H19" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 14H17" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
   </svg>
);

const IconTicket = () => (
   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="2 2"/>
      <path d="M8 6V18" stroke="#4B5563" strokeWidth="1.5" strokeDasharray="2 2"/>
   </svg>
);

const IconLuggage = () => (
   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5">
      <rect x="6" y="8" width="12" height="13" rx="2" stroke="#4B5563" strokeWidth="1.5"/>
      <path d="M9 8V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V8" stroke="#4B5563" strokeWidth="1.5"/>
      <path d="M10 12V17" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 12V17" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
   </svg>
);

function FlightSection({ title, leg, cabin, fareType }: { title: string; leg: FlightLeg; cabin: string; fareType: string }) {
  const dateFormatted = formatFlightDateWithDay(leg.date);

  return (
    <div className="bg-white rounded-md mt-4 border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-300 flex items-center">
        <IconPlane />
        <span className="font-bold text-[14px] text-black">{title}</span>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {/* Table Header Row */}
        <div className="grid grid-cols-[170px_180px_120px_180px_100px_120px] text-[13px] font-bold text-black py-3 border-b border-gray-200">
          <div>Airline</div>
          <div>Departure</div>
          <div>Duration</div>
          <div>Arrival</div>
          <div>Cabin</div>
          <div>Type</div>
        </div>

        {/* Data Row */}
        <div className="grid grid-cols-[170px_180px_120px_180px_100px_120px] pt-4 items-start text-black text-[13px]">
          {/* Airline */}
          <div className="flex flex-col gap-1">
            <img
              src="/flightbooking/Myanmar-Airways-International-Logo.png"
              alt="MAI"
              className="w-9 h-9 object-contain"
            />
            <div className="font-bold">Myanmar Airways<br />Intl</div>
          </div>

          {/* Departure */}
          <div>
            <div className="font-bold">{leg.fromCity}</div>
            <div className="font-bold">
              {dateFormatted} - {leg.departureTime}
            </div>
            <div className="text-gray-500 mt-1">{leg.fromAirport}</div>
          </div>

          {/* Duration */}
          <div className="font-bold">{leg.duration}</div>

          {/* Arrival */}
          <div>
            <div className="font-bold">{leg.toCity}</div>
            <div className="font-bold">
              {dateFormatted} - {leg.arrivalTime}
            </div>
            <div className="text-gray-500 mt-1">{leg.toAirport}</div>
          </div>

          {/* Cabin */}
          <div>{cabin}</div>

          {/* Type */}
          <div>{fareType}</div>
        </div>
      </div>
    </div>
  );
}

const FlightTicketTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const issueDateFormatted = formatIssueDate(data.issueDate);
  const showOnward = data.tripType === 'onward' || data.tripType === 'round';
  const showReturn = data.tripType === 'return' || data.tripType === 'round';

  return (
    <div
      ref={ref}
      className="bg-white text-black w-[900px] mx-auto box-border pt-4 pb-8"
      style={{
        fontFamily: "'Inter', 'Segoe UI', 'Arial', sans-serif",
        lineHeight: '1.4',
      }}
    >
      {/* ===== HEADER BANNER ===== */}
      <div className="bg-[#112d50] rounded-lg flex items-center justify-between h-[84px] px-6 mx-4">
        {/* LOGO AREA */}
        <div className="text-[34px] tracking-tight relative -mt-1" style={{ letterSpacing: '-0.5px' }}>
          <span className="text-white">book</span>
          <span className="text-[#f58220]">mein</span>
          <span className="text-white">.me</span>
        </div>

        {/* DETAILS BLOCK PILL */}
        <div className="flex bg-[#1e3c60] rounded-2xl w-[460px] h-[56px] items-center">
          <div className="flex-1 px-5 h-[40px] border-r border-[#405b7b] flex flex-col justify-center">
            <div className="text-[11px] text-[#8fa7c2] font-semibold leading-tight">PNR Number</div>
            <div className="text-[15px] font-bold text-white mt-0.5 leading-tight">{data.pnr || '------'}</div>
          </div>
          <div className="flex-1 px-6 h-[40px] flex flex-col justify-center">
            <div className="text-[11px] text-[#8fa7c2] font-semibold leading-tight">Issue Date</div>
            <div className="text-[15px] font-bold text-white mt-0.5 leading-tight">{issueDateFormatted}</div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="px-4">

        {/* ===== ONWARD FLIGHT ===== */}
        {showOnward && (
          <FlightSection
            title="Flight Details (Onward)"
            leg={data.onwardFlight}
            cabin={data.cabin}
            fareType={data.fareType}
          />
        )}

        {/* ===== RETURN FLIGHT ===== */}
        {showReturn && (
          <FlightSection
            title="Flight Details (Return)"
            leg={data.returnFlight}
            cabin={data.cabin}
            fareType={data.fareType}
          />
        )}

        {/* ===== PASSENGER DETAILS ===== */}
        <div className="bg-white rounded-md mt-4 border border-gray-300 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-300 flex items-center">
            <IconPassport />
            <span className="font-bold text-[14px] text-black">Passenger Details (1)</span>
          </div>

          <div className="px-4 pb-4">
            {/* Table Header Row */}
            <div className="grid grid-cols-[270px_290px_1fr] text-[13px] font-bold text-black py-3 border-b border-gray-200">
              <div className="flex items-center">
                <IconId /> Pax Name
              </div>
              <div className="flex items-center">
                <IconTicket /> PNR
              </div>
              <div className="flex items-center">
                <IconLuggage /> Baggage
              </div>
            </div>

            {/* Data Row */}
            <div className="grid grid-cols-[270px_290px_1fr] pt-4 text-black text-[13px]">
              <div className="font-bold uppercase">
                {data.passengerTitle}{data.passengerName || 'PASSENGER NAME'}
              </div>
              <div>{data.pnr || '------'}</div>
              <div className="leading-relaxed">
                <div><span className="font-bold">Check-in:</span> {data.checkinBaggage}</div>
                <div><span className="font-bold">Cabin:</span> {data.cabinBaggage}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== GENERAL RULES ===== */}
        <div className="bg-white rounded-md mt-4 border border-gray-300 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-300 flex items-center">
            <IconDocument />
            <span className="font-bold text-[14px] text-black">General Rules and Regulation/Important Information</span>
          </div>

          <div className="p-4 text-[12.5px] text-gray-900 leading-[1.8]">
            <p className="mb-1">• All passengers must produce a valid photo identification proof at the time of check in.</p>
            <p className="mb-1">• Guests will be subjected to a security screening prior to boarding the aircraft. This is mandatory per Indian Regulations.</p>
            <p className="mb-1">• For flights within India check-in usually starts 2 hours before departure, and check-in counters will be closed 45 minutes before departure.</p>
            <p className="mb-1">• For all classes of guests.</p>
            <p className="mb-1">• For International flights check-in usually starts 3 hours prior to departure, and check-in counters will be closed 60 minutes before departure.</p>
            <p className="mb-1">• For all classes of guests.</p>
            <p className="mb-1">• Flight timings are subject to change without prior notice. Please recheck with the carrier prior to departure.</p>
            <p className="mb-1">• For fare rules and cancellation policy, refer to rules laid by the carrier.</p>
            <p className="mb-1">• While compiling all the above information, we have endeavored to ensure it is correct. However, no guarantee or representation is made to its accuracy or completeness.</p>
            <p className="m-0">• This information is subject to changes by airlines.</p>
          </div>
        </div>
      </div>
    </div>
  );
});

FlightTicketTemplate.displayName = 'FlightTicketTemplate';

export default FlightTicketTemplate;
