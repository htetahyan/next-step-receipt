'use client';

import { airportCity } from '@/lib/issueDesk';

export type FlightDraft = {
  airlineId: string;
  airlineName: string;
  logo: string;
  passenger: string;
  pnr: string;
  ticketNo: string;
  from: string;
  to: string;
  routing: 'direct' | 'transit';
  via: string;
  date: string;
  depart: string;
  arrive: string;
  flightNo: string;
  date2: string;
  depart2: string;
  arrive2: string;
  flightNo2: string;
  cabin: string;
  baggage: string;
  price: string;
  currency: string;
  showPrice: boolean;
  showLogo: boolean;
};

export type HotelDraft = {
  guest: string;
  hotel: string;
  city: string;
  confirmation: string;
  checkIn: string;
  checkOut: string;
  room: string;
  meal: string;
  guests: string;
  price: string;
  currency: string;
  showPrice: boolean;
  showLogo: boolean;
  note: string;
};

export function FlightTicketView({ draft }: { draft: FlightDraft }) {
  return (
    <div className="w-[820px] bg-[#f6f1e8] text-[#14221c] shadow-2xl">
      <div className="flex items-center justify-between bg-[#0e2a22] px-8 py-5 text-[#f6f1e8]">
        <div className="flex items-center gap-4">
          {draft.logo ? (
            <img src={draft.logo} alt="" className="h-14 w-14 rounded-md bg-white object-contain p-1" />
          ) : null}
          <div>
            <div className="text-[11px] tracking-[0.28em] uppercase text-[#d7c4a3]">Electronic ticket</div>
            <div className="text-xl font-semibold">{draft.airlineName || 'Airline'}</div>
          </div>
        </div>
        {draft.showLogo ? <img src="/logo.png" alt="NextStep" className="h-16 w-auto object-contain" /> : <div className="text-xs tracking-[0.2em] uppercase text-[#d7c4a3]">Itinerary</div>}
      </div>
      <div className="px-8 py-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8a7352]">Passenger</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">{draft.passenger || 'Passenger name'}</div>
        <div className={`mt-6 grid items-end gap-3 border-y border-[#d9cbb6] py-5 ${draft.routing === 'transit' ? 'grid-cols-3' : 'grid-cols-[1fr_auto_1fr]'}`}>
          <div>
            <div className="text-4xl font-semibold">{draft.from || 'RGN'}</div>
            <div className="text-sm text-[#5c6b63]">{airportCity(draft.from)}</div>
          </div>
          {draft.routing === 'transit' ? (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a7352]">Via</div>
              <div className="text-4xl font-semibold">{draft.via || 'BKK'}</div>
              <div className="text-sm text-[#5c6b63]">{airportCity(draft.via)}</div>
            </div>
          ) : (
            <div className="pb-3 text-center text-xs uppercase tracking-[0.2em] text-[#8a7352]">Direct</div>
          )}
          <div className={draft.routing === 'transit' ? '' : 'text-right'}>
            <div className="text-4xl font-semibold">{draft.to || 'BKK'}</div>
            <div className="text-sm text-[#5c6b63]">{airportCity(draft.to)}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-4 text-sm">
          <Field label="Date" value={draft.date} />
          <Field label="Depart" value={draft.depart} />
          <Field label="Arrive" value={draft.arrive} />
          <Field label={draft.routing === 'transit' ? 'Flight 1' : 'Flight'} value={draft.flightNo} />
          {draft.routing === 'transit' && (
            <>
              <Field label="Connection date" value={draft.date2 || draft.date} />
              <Field label="Depart 2" value={draft.depart2} />
              <Field label="Arrive 2" value={draft.arrive2} />
              <Field label="Flight 2" value={draft.flightNo2} />
            </>
          )}
          <Field label="Cabin" value={draft.cabin} />
          <Field label="Baggage" value={draft.baggage} />
          <Field label="PNR" value={draft.pnr} />
          <Field label="Ticket" value={draft.ticketNo} />
        </div>
        {draft.showPrice && (
          <div className="mt-6 flex items-end justify-between border-t border-[#d9cbb6] pt-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8a7352]">Fare</div>
            <div className="text-2xl font-semibold">{draft.currency} {draft.price || '0'}</div>
          </div>
        )}
        <p className="mt-6 text-[11px] leading-relaxed text-[#6d6458]">
          Issued by NextStep Travel & Tourism. This document is a passenger itinerary for the client. Check in with the airline using the PNR.
        </p>
      </div>
    </div>
  );
}

export function HotelVoucherView({ draft }: { draft: HotelDraft }) {
  return (
    <div className="w-[820px] bg-[#f7f5f1] text-[#1b1a17] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#e4ddd2] px-8 py-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#8d7348]">Hotel voucher</div>
          <div className="mt-1 text-2xl font-semibold">{draft.hotel || 'Hotel name'}</div>
          <div className="text-sm text-[#6d675f]">{draft.city || 'City'}</div>
        </div>
        {draft.showLogo ? <img src="/logo.png" alt="NextStep" className="h-16 w-auto object-contain" /> : null}
      </div>
      <div className="px-8 py-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8d7348]">Guest</div>
        <div className="mt-1 text-3xl font-semibold">{draft.guest || 'Guest name'}</div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Field label="Confirmation" value={draft.confirmation} />
          <Field label="Guests" value={draft.guests} />
          <Field label="Check in" value={draft.checkIn} />
          <Field label="Check out" value={draft.checkOut} />
          <Field label="Room" value={draft.room} />
          <Field label="Meal" value={draft.meal} />
        </div>
        {draft.showPrice && (
          <div className="mt-6 flex items-end justify-between border-t border-[#e4ddd2] pt-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8d7348]">Amount</div>
            <div className="text-2xl font-semibold">{draft.currency} {draft.price || '0'}</div>
          </div>
        )}
        {draft.note ? <p className="mt-4 text-sm text-[#4d4943]">{draft.note}</p> : null}
        <p className="mt-6 text-[11px] leading-relaxed text-[#6d675f]">Issued by NextStep Travel & Tourism for the guest named above.</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#8a7352]">{label}</div>
      <div className="mt-1 font-medium">{value || '—'}</div>
    </div>
  );
}
