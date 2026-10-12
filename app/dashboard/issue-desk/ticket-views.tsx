'use client';

import { addOneDay, airportCity } from '@/lib/issueDesk';

export type FlightDraft = {
  airlineId: string;
  airlineName: string;
  logo: string;
  airlineId2: string;
  airlineName2: string;
  logo2: string;
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
  nextDay: boolean;
  nextDay2: boolean;
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
  const twoCarriers = draft.routing === 'transit' && draft.logo2 && draft.logo2 !== draft.logo;
  return (
    <div className="w-[860px] overflow-hidden rounded-sm bg-white text-[#111827] shadow-[0_24px_60px_rgba(14,42,34,0.18)]">
      <div className="flex items-center justify-between bg-[#0b1f33] px-8 py-4 text-white">
        <div className="flex items-center gap-4">
          {draft.logo ? <img src={draft.logo} alt="" className="h-12 w-12 rounded bg-white object-contain p-0.5" /> : null}
          {twoCarriers ? <img src={draft.logo2} alt="" className="h-12 w-12 rounded bg-white object-contain p-0.5" /> : null}
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#c9b48a]">Passenger itinerary</div>
            <div className="text-lg font-semibold leading-tight">
              {twoCarriers ? `${draft.airlineName} + ${draft.airlineName2}` : draft.airlineName || 'Airline'}
            </div>
          </div>
        </div>
        {draft.showLogo ? <img src="/logo.png" alt="NextStep" className="h-14 w-auto object-contain" /> : <div className="text-[10px] uppercase tracking-[0.24em] text-[#c9b48a]">Confirmed</div>}
      </div>

      <div className="px-8 py-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a7352]">Passenger</div>
            <div className="mt-0.5 text-[28px] font-semibold tracking-tight">{draft.passenger || 'Passenger name'}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#8a7352]">PNR</div>
            <div className="font-mono text-lg font-semibold">{draft.pnr || '—'}</div>
          </div>
        </div>

        <div className={`mt-5 grid items-center gap-2 rounded-lg bg-[#f6f1e8] px-5 py-4 ${draft.routing === 'transit' ? 'grid-cols-3' : 'grid-cols-[1fr_auto_1fr]'}`}>
          <AirportBlock code={draft.from || 'RGN'} align="left" />
          {draft.routing === 'transit' ? (
            <AirportBlock code={draft.via || 'BKK'} align="center" label="Via" />
          ) : (
            <div className="text-center text-[10px] uppercase tracking-[0.22em] text-[#8a7352]">Nonstop</div>
          )}
          <AirportBlock code={draft.to || 'BKK'} align={draft.routing === 'transit' ? 'right' : 'right'} />
        </div>

        <Leg
          title={draft.routing === 'transit' ? 'Leg 1' : 'Flight'}
          logo={draft.logo}
          airline={draft.airlineName}
          from={draft.from}
          to={draft.routing === 'transit' ? draft.via : draft.to}
          date={draft.date}
          depart={draft.depart}
          arrive={draft.arrive}
          flightNo={draft.flightNo}
          nextDay={draft.nextDay}
        />
        {draft.routing === 'transit' && (
          <Leg
            title="Leg 2"
            logo={draft.logo2 || draft.logo}
            airline={draft.airlineName2 || draft.airlineName}
            from={draft.via}
            to={draft.to}
            date={draft.date2 || (draft.nextDay ? addOneDay(draft.date) : draft.date)}
            depart={draft.depart2}
            arrive={draft.arrive2}
            flightNo={draft.flightNo2}
            nextDay={draft.nextDay2}
          />
        )}

        <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
          <Field label="Cabin" value={draft.cabin} />
          <Field label="Baggage" value={draft.baggage} />
          <Field label="Status" value="Confirmed" />
          <Field label="E-ticket" value={draft.ticketNo || '—'} />
        </div>
        {draft.showPrice && (
          <div className="mt-5 flex items-end justify-between border-t border-[#eadfcf] pt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a7352]">Fare</div>
            <div className="text-2xl font-semibold">{draft.currency} {draft.price || '0'}</div>
          </div>
        )}
        <p className="mt-5 text-[11px] leading-relaxed text-[#6d6458]">
          Issued as a dummy / client itinerary. Check in with the operating airline using the PNR. Not a boarding pass.
        </p>
      </div>
    </div>
  );
}

function AirportBlock({ code, align, label }: { code: string; align: 'left' | 'center' | 'right'; label?: string }) {
  return (
    <div className={align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}>
      {label ? <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a7352]">{label}</div> : null}
      <div className="text-[40px] font-semibold leading-none">{code}</div>
      <div className="mt-1 text-sm text-[#5c6b63]">{airportCity(code)}</div>
    </div>
  );
}

function Leg({
  title, logo, airline, from, to, date, depart, arrive, flightNo, nextDay,
}: {
  title: string; logo: string; airline: string; from: string; to: string; date: string; depart: string; arrive: string; flightNo: string; nextDay?: boolean;
}) {
  const arriveDate = nextDay ? addOneDay(date) : date;
  return (
    <div className="mt-4 flex items-center gap-4 rounded-lg border border-[#eadfcf] px-4 py-3">
      {logo ? <img src={logo} alt="" className="h-10 w-10 rounded bg-[#f6f1e8] object-contain p-0.5" /> : null}
      <div className="min-w-[140px]">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#8a7352]">{title}</div>
        <div className="text-sm font-semibold">{airline}</div>
        <div className="font-mono text-sm">{flightNo || '—'}</div>
      </div>
      <div className="flex-1 text-sm">
        <div className="font-semibold">{from} → {to}</div>
        <div className="text-[#5c6b63]">
          {date || 'Date'} {depart || '—'} → {arriveDate && arriveDate !== date ? `${arriveDate} ` : ''}{arrive || '—'}
          {nextDay ? <span className="ml-2 rounded-full bg-[#0b1f33] px-1.5 py-0.5 text-[10px] font-semibold text-white">+1 day</span> : null}
        </div>
      </div>
    </div>
  );
}

export function HotelVoucherView({ draft }: { draft: HotelDraft }) {
  return (
    <div className="w-[820px] overflow-hidden rounded-sm bg-white text-[#1b1a17] shadow-[0_24px_60px_rgba(14,42,34,0.18)]">
      <div className="flex items-center justify-between bg-[#0b1f33] px-8 py-5 text-white">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#c9b48a]">Hotel voucher</div>
          <div className="mt-1 text-2xl font-semibold">{draft.hotel || 'Hotel name'}</div>
          <div className="text-sm text-white/70">{draft.city || 'City'}</div>
        </div>
        {draft.showLogo ? <img src="/logo.png" alt="NextStep" className="h-14 w-auto object-contain" /> : <div className="text-[10px] uppercase tracking-[0.24em] text-[#c9b48a]">Confirmed</div>}
      </div>
      <div className="px-8 py-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#8d7348]">Guest</div>
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
          <div className="mt-6 flex items-end justify-between border-t border-[#eadfcf] pt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#8d7348]">Amount</div>
            <div className="text-2xl font-semibold">{draft.currency} {draft.price || '0'}</div>
          </div>
        )}
        {draft.note ? <p className="mt-4 text-sm text-[#4d4943]">{draft.note}</p> : null}
        <p className="mt-6 text-[11px] leading-relaxed text-[#6d675f]">Issued as a client voucher. Present at the hotel with a passport.</p>
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
