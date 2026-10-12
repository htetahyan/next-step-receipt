'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import { AIRLINES, AIRPORTS, SECTORS, TRANSIT_ROUTES, airlineById, arrivesNextDay, needsTransit, usualFlights } from '@/lib/issueDesk';
import { FlightDraft, FlightTicketView, HotelDraft, HotelVoucherView } from './ticket-views';

const input = 'h-9 w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 text-sm';

export default function IssueDeskPage() {
  const sheet = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<'flight' | 'hotel'>('flight');
  const [busy, setBusy] = useState(false);
  const [flight, setFlight] = useState<FlightDraft>({
    airlineId: 'mai',
    airlineName: AIRLINES[0].name,
    logo: AIRLINES[0].logo,
    airlineId2: 'emirates',
    airlineName2: 'Emirates',
    logo2: '/airlines/emirates.png',
    passenger: '',
    pnr: '',
    ticketNo: '',
    from: 'RGN',
    to: 'BKK',
    routing: 'direct',
    via: 'BKK',
    date: '',
    depart: '',
    arrive: '',
    flightNo: '',
    date2: '',
    depart2: '',
    arrive2: '',
    flightNo2: '',
    nextDay: false,
    nextDay2: false,
    cabin: 'Economy',
    baggage: '20 kg',
    price: '',
    currency: 'USD',
    showPrice: false,
    showLogo: false,
  });
  const [hotel, setHotel] = useState<HotelDraft>({
    guest: '',
    hotel: '',
    city: 'Bangkok',
    confirmation: '',
    checkIn: '',
    checkOut: '',
    room: 'Deluxe',
    meal: 'Breakfast',
    guests: '1',
    price: '',
    currency: 'USD',
    showPrice: false,
    showLogo: false,
    note: '',
  });

  const pickAirline = (id: string, leg: 1 | 2 = 1) => {
    const airline = airlineById(id);
    if (!airline) return;
    setFlight((f) =>
      leg === 2
        ? { ...f, airlineId2: id, airlineName2: airline.name, logo2: airline.logo }
        : { ...f, airlineId: id, airlineName: airline.name, logo: airline.logo }
    );
  };

  const applyUsual = (leg: 1 | 2, flightNo: string, depart: string, arrive: string, nextDay?: boolean) => {
    const overnight = arrivesNextDay(depart, arrive, nextDay);
    setFlight((f) =>
      leg === 2
        ? { ...f, flightNo2: flightNo, depart2: depart, arrive2: arrive, nextDay2: overnight }
        : { ...f, flightNo, depart, arrive, nextDay: overnight }
    );
  };

  const applyTransit = (route: (typeof TRANSIT_ROUTES)[number]) => {
    const a1 = airlineById(route.airline1);
    const a2 = airlineById(route.airline2);
    const leg1 = usualFlights(route.airline1, route.from, route.via)[0];
    const leg2 = usualFlights(route.airline2, route.via, route.to)[0];
    setFlight((f) => ({
      ...f,
      routing: 'transit',
      from: route.from,
      via: route.via,
      to: route.to,
      airlineId: route.airline1,
      airlineName: a1?.name || f.airlineName,
      logo: a1?.logo || f.logo,
      airlineId2: route.airline2,
      airlineName2: a2?.name || f.airlineName2,
      logo2: a2?.logo || f.logo2,
      flightNo: leg1?.flightNo || '',
      depart: leg1?.depart || '',
      arrive: leg1?.arrive || '',
      nextDay: arrivesNextDay(leg1?.depart || '', leg1?.arrive || '', leg1?.nextDay),
      flightNo2: leg2?.flightNo || '',
      depart2: leg2?.depart || '',
      arrive2: leg2?.arrive || '',
      nextDay2: arrivesNextDay(leg2?.depart || '', leg2?.arrive || '', leg2?.nextDay),
    }));
  };

  const download = async () => {
    if (!sheet.current) return;
    setBusy(true);
    try {
      const name = kind === 'flight' ? flight.passenger || 'ticket' : hotel.guest || 'voucher';
      await downloadInvoicePdf(sheet.current, `${kind}-${name}.pdf`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not download');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 pb-16 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 max-h-[calc(100vh-24px)] overflow-y-auto">
        <div>
          <h1 className="text-xl font-semibold">Issue desk</h1>
          <p className="text-xs text-[var(--muted)]">Nothing is saved. Download a ticket or hotel voucher for the client.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setKind('flight')} className={`rounded-md px-3 py-1.5 text-sm ${kind === 'flight' ? 'bg-[#0e2a22] text-white' : 'border border-[var(--card-border)]'}`}>Flight</button>
          <button type="button" onClick={() => setKind('hotel')} className={`rounded-md px-3 py-1.5 text-sm ${kind === 'hotel' ? 'bg-[#0e2a22] text-white' : 'border border-[var(--card-border)]'}`}>Hotel</button>
        </div>

        {kind === 'flight' ? (
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide opacity-60">{flight.routing === 'transit' ? 'Airline 1' : 'Airline'}</div>
              <AirlineRow selected={flight.airlineId} onPick={(id) => pickAirline(id, 1)} />
            </div>
            {flight.routing === 'transit' && (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide opacity-60">Airline 2</div>
                <AirlineRow selected={flight.airlineId2} onPick={(id) => pickAirline(id, 2)} />
              </div>
            )}
            <label className="block text-xs">Passenger<input className={input} value={flight.passenger} onChange={(e) => setFlight({ ...flight, passenger: e.target.value })} /></label>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide opacity-60">Direct</div>
              <div className="flex flex-wrap gap-1">
                {SECTORS.filter(([from, to]) => !needsTransit(from, to)).map(([from, to]) => (
                  <button key={`${from}${to}`} type="button" onClick={() => setFlight({ ...flight, from, to, routing: 'direct' })} className="rounded-full border border-[var(--card-border)] px-2 py-1 text-[11px]">{from}–{to}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide opacity-60">Transit</div>
              <div className="flex flex-wrap gap-1">
                {TRANSIT_ROUTES.map((route) => {
                  const a1 = airlineById(route.airline1);
                  const a2 = airlineById(route.airline2);
                  return (
                    <button
                      key={`${route.from}${route.via}${route.to}${route.airline1}${route.airline2}`}
                      type="button"
                      onClick={() => applyTransit(route)}
                      className="rounded-full border border-[var(--card-border)] px-2 py-1 text-[11px]"
                    >
                      {route.from}–{route.via}–{route.to} {a1?.code}+{a2?.code}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFlight({ ...flight, routing: 'direct' })} className={`rounded-md px-3 py-1.5 text-xs ${flight.routing === 'direct' ? 'bg-[#0e2a22] text-white' : 'border border-[var(--card-border)]'}`}>Direct</button>
              <button type="button" onClick={() => setFlight({ ...flight, routing: 'transit', via: flight.via || 'BKK' })} className={`rounded-md px-3 py-1.5 text-xs ${flight.routing === 'transit' ? 'bg-[#0e2a22] text-white' : 'border border-[var(--card-border)]'}`}>Transit</button>
            </div>
            {flight.routing === 'transit' && (
              <label className="block text-xs">Connection airport
                <select className={input} value={flight.via} onChange={(e) => setFlight({ ...flight, via: e.target.value })}>
                  {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.city}</option>)}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">From
                <select className={input} value={flight.from} onChange={(e) => setFlight({ ...flight, from: e.target.value })}>
                  {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.city}</option>)}
                </select>
              </label>
              <label className="text-xs">To
                <select className={input} value={flight.to} onChange={(e) => setFlight({ ...flight, to: e.target.value })}>
                  {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.city}</option>)}
                </select>
              </label>
              <label className="text-xs">Date<input className={input} value={flight.date} onChange={(e) => setFlight({ ...flight, date: e.target.value })} placeholder="14 Sep 2026" /></label>
              <label className="text-xs">{flight.routing === 'transit' ? 'Flight 1' : 'Flight'}<input className={input} value={flight.flightNo} onChange={(e) => setFlight({ ...flight, flightNo: e.target.value })} placeholder="8M 331" /></label>
              <label className="text-xs">Depart<input className={input} value={flight.depart} onChange={(e) => setFlight({ ...flight, depart: e.target.value })} placeholder="09:30" /></label>
              <label className="text-xs">Arrive
                <div className="flex gap-1">
                  <input className={input} value={flight.arrive} onChange={(e) => setFlight({ ...flight, arrive: e.target.value, nextDay: arrivesNextDay(flight.depart, e.target.value) })} placeholder="09:05" />
                  <button type="button" onClick={() => setFlight({ ...flight, nextDay: !flight.nextDay })} className={`h-9 shrink-0 rounded-md px-2 text-[11px] font-semibold ${flight.nextDay ? 'bg-[#0b1f33] text-white' : 'border border-[var(--card-border)]'}`}>+1</button>
                </div>
              </label>
              <label className="text-xs">PNR<input className={input} value={flight.pnr} onChange={(e) => setFlight({ ...flight, pnr: e.target.value.toUpperCase() })} /></label>
              <label className="text-xs">Ticket no.<input className={input} value={flight.ticketNo} onChange={(e) => setFlight({ ...flight, ticketNo: e.target.value })} /></label>
              <label className="text-xs">Cabin<input className={input} value={flight.cabin} onChange={(e) => setFlight({ ...flight, cabin: e.target.value })} /></label>
              <label className="text-xs">Baggage<input className={input} value={flight.baggage} onChange={(e) => setFlight({ ...flight, baggage: e.target.value })} /></label>
              {flight.routing === 'transit' && (
                <>
                  <label className="text-xs">Flight 2<input className={input} value={flight.flightNo2} onChange={(e) => setFlight({ ...flight, flightNo2: e.target.value })} placeholder="EK 376" /></label>
                  <label className="text-xs">Date 2<input className={input} value={flight.date2} onChange={(e) => setFlight({ ...flight, date2: e.target.value })} placeholder="Same day if blank" /></label>
                  <label className="text-xs">Depart 2<input className={input} value={flight.depart2} onChange={(e) => setFlight({ ...flight, depart2: e.target.value })} /></label>
                  <label className="text-xs">Arrive 2
                    <div className="flex gap-1">
                      <input className={input} value={flight.arrive2} onChange={(e) => setFlight({ ...flight, arrive2: e.target.value, nextDay2: arrivesNextDay(flight.depart2, e.target.value) })} />
                      <button type="button" onClick={() => setFlight({ ...flight, nextDay2: !flight.nextDay2 })} className={`h-9 shrink-0 rounded-md px-2 text-[11px] font-semibold ${flight.nextDay2 ? 'bg-[#0b1f33] text-white' : 'border border-[var(--card-border)]'}`}>+1</button>
                    </div>
                  </label>
                </>
              )}
            </div>
            <UsualChips
              label={flight.routing === 'transit' ? `Leg 1 ${flight.from}–${flight.via}` : `${flight.from}–${flight.to}`}
              airlineId={flight.airlineId}
              from={flight.from}
              to={flight.routing === 'transit' ? flight.via : flight.to}
              onPick={(fno, dep, arr) => applyUsual(1, fno, dep, arr)}
            />
            {flight.routing === 'transit' && (
              <UsualChips
                label={`Leg 2 ${flight.via}–${flight.to}`}
                airlineId={flight.airlineId2}
                from={flight.via}
                to={flight.to}
                onPick={(fno, dep, arr) => applyUsual(2, fno, dep, arr)}
              />
            )}
            <Toggle label="Show NextStep logo" on={flight.showLogo} set={(showLogo) => setFlight({ ...flight, showLogo })} />
            <Toggle label="Show price" on={flight.showPrice} set={(showPrice) => setFlight({ ...flight, showPrice })} />
            {flight.showPrice && (
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input className={input} value={flight.currency} onChange={(e) => setFlight({ ...flight, currency: e.target.value.toUpperCase() })} />
                <input className={input} value={flight.price} onChange={(e) => setFlight({ ...flight, price: e.target.value })} placeholder="Price" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {['Bangkok', 'Yangon', 'Dubai', 'Singapore', 'Mandalay'].map((city) => (
                <button key={city} type="button" onClick={() => setHotel({ ...hotel, city })} className="rounded-full border border-[var(--card-border)] px-2 py-1 text-[11px]">{city}</button>
              ))}
            </div>
            <label className="block text-xs">Guest<input className={input} value={hotel.guest} onChange={(e) => setHotel({ ...hotel, guest: e.target.value })} /></label>
            <label className="block text-xs">Hotel<input className={input} value={hotel.hotel} onChange={(e) => setHotel({ ...hotel, hotel: e.target.value })} /></label>
            <label className="block text-xs">City<input className={input} value={hotel.city} onChange={(e) => setHotel({ ...hotel, city: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">Check in<input className={input} value={hotel.checkIn} onChange={(e) => setHotel({ ...hotel, checkIn: e.target.value })} /></label>
              <label className="text-xs">Check out<input className={input} value={hotel.checkOut} onChange={(e) => setHotel({ ...hotel, checkOut: e.target.value })} /></label>
              <label className="text-xs">Room<input className={input} value={hotel.room} onChange={(e) => setHotel({ ...hotel, room: e.target.value })} /></label>
              <label className="text-xs">Meal<input className={input} value={hotel.meal} onChange={(e) => setHotel({ ...hotel, meal: e.target.value })} /></label>
              <label className="text-xs">Confirmation<input className={input} value={hotel.confirmation} onChange={(e) => setHotel({ ...hotel, confirmation: e.target.value })} /></label>
              <label className="text-xs">Guests<input className={input} value={hotel.guests} onChange={(e) => setHotel({ ...hotel, guests: e.target.value })} /></label>
            </div>
            <label className="block text-xs">Note<textarea className={`${input} h-16 py-2`} value={hotel.note} onChange={(e) => setHotel({ ...hotel, note: e.target.value })} /></label>
            <Toggle label="Show NextStep logo" on={hotel.showLogo} set={(showLogo) => setHotel({ ...hotel, showLogo })} />
            <Toggle label="Show price" on={hotel.showPrice} set={(showPrice) => setHotel({ ...hotel, showPrice })} />
            {hotel.showPrice && (
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input className={input} value={hotel.currency} onChange={(e) => setHotel({ ...hotel, currency: e.target.value.toUpperCase() })} />
                <input className={input} value={hotel.price} onChange={(e) => setHotel({ ...hotel, price: e.target.value })} placeholder="Price" />
              </div>
            )}
          </div>
        )}
        <button type="button" disabled={busy} onClick={download} className="sticky bottom-0 w-full rounded-md bg-[#0e2a22] py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {busy ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-[var(--card-border)] bg-[#e7e2d8] p-4 min-h-[70vh]">
        <div ref={sheet} className="mx-auto w-fit">
          {kind === 'flight' ? <FlightTicketView draft={flight} /> : <HotelVoucherView draft={hotel} />}
        </div>
      </div>
    </div>
  );
}

function AirlineRow({ selected, onPick }: { selected: string; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {AIRLINES.map((airline) => (
        <button key={airline.id} type="button" onClick={() => onPick(airline.id)} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${selected === airline.id ? 'border-[#0b1f33] bg-[#0b1f33] text-white' : 'border-[var(--card-border)]'}`}>
          <img src={airline.logo} alt="" className="h-5 w-5 rounded bg-white object-contain" />
          {airline.code}
        </button>
      ))}
    </div>
  );
}

function UsualChips({
  label,
  airlineId,
  from,
  to,
  onPick,
}: {
  label: string;
  airlineId: string;
  from: string;
  to: string;
  onPick: (flightNo: string, depart: string, arrive: string, nextDay?: boolean) => void;
}) {
  const options = usualFlights(airlineId, from, to);
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide opacity-60">{label}</div>
      {options.length ? (
        <div className="flex flex-wrap gap-1">
          {options.map((option) => (
            <button key={option.flightNo} type="button" onClick={() => onPick(option.flightNo, option.depart, option.arrive, option.nextDay)} className="rounded-full border border-[var(--card-border)] px-2 py-1 text-[11px]">
              {option.flightNo} {option.depart}{arrivesNextDay(option.depart, option.arrive, option.nextDay) ? ' +1' : ''}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] opacity-50">No usual flights for this airline on {from}–{to}.</p>
      )}
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => set(!on)} className="flex items-center justify-between rounded-md border border-[var(--card-border)] px-3 py-2 text-sm">
      <span>{label}</span>
      <span className={on ? 'text-[#0e2a22] font-medium' : 'opacity-50'}>{on ? 'On' : 'Off'}</span>
    </button>
  );
}
