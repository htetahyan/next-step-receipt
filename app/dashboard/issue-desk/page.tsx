'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import { AIRLINES, AIRPORTS, SECTORS } from '@/lib/issueDesk';
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
    cabin: 'Economy',
    baggage: '20 kg',
    price: '',
    currency: 'USD',
    showPrice: true,
    showLogo: true,
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
    showLogo: true,
    note: '',
  });

  const pickAirline = (id: string) => {
    const airline = AIRLINES.find((a) => a.id === id);
    if (!airline) return;
    setFlight((f) => ({ ...f, airlineId: id, airlineName: airline.name, logo: airline.logo }));
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
    <div className="grid gap-6 pb-16 xl:grid-cols-[380px_1fr]">
      <div className="space-y-4">
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
            <div className="flex gap-2">
              {AIRLINES.map((airline) => (
                <button key={airline.id} type="button" onClick={() => pickAirline(airline.id)} className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${flight.airlineId === airline.id ? 'border-[#0e2a22] bg-[#0e2a22] text-white' : 'border-[var(--card-border)]'}`}>
                  <img src={airline.logo} alt="" className="h-6 w-6 rounded bg-white object-contain" />
                  {airline.code}
                </button>
              ))}
            </div>
            <label className="block text-xs">Passenger<input className={input} value={flight.passenger} onChange={(e) => setFlight({ ...flight, passenger: e.target.value })} /></label>
            <div className="flex flex-wrap gap-1">
              {SECTORS.map(([from, to]) => (
                <button key={`${from}${to}`} type="button" onClick={() => setFlight({ ...flight, from, to, routing: needsTransit(from, to) ? 'transit' : flight.routing, via: needsTransit(from, to) ? 'BKK' : flight.via })} className="rounded-full border border-[var(--card-border)] px-2 py-1 text-[11px]">{from}–{to}</button>
              ))}
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
              <label className="text-xs">{flight.routing === 'transit' ? 'Flight 1' : 'Flight'}<input className={input} value={flight.flightNo} onChange={(e) => setFlight({ ...flight, flightNo: e.target.value })} placeholder="8M 501" /></label>
              <label className="text-xs">Depart<input className={input} value={flight.depart} onChange={(e) => setFlight({ ...flight, depart: e.target.value })} placeholder="09:30" /></label>
              <label className="text-xs">Arrive<input className={input} value={flight.arrive} onChange={(e) => setFlight({ ...flight, arrive: e.target.value })} placeholder="11:20" /></label>
              <label className="text-xs">PNR<input className={input} value={flight.pnr} onChange={(e) => setFlight({ ...flight, pnr: e.target.value.toUpperCase() })} /></label>
              <label className="text-xs">Ticket no.<input className={input} value={flight.ticketNo} onChange={(e) => setFlight({ ...flight, ticketNo: e.target.value })} /></label>
              <label className="text-xs">Cabin<input className={input} value={flight.cabin} onChange={(e) => setFlight({ ...flight, cabin: e.target.value })} /></label>
              <label className="text-xs">Baggage<input className={input} value={flight.baggage} onChange={(e) => setFlight({ ...flight, baggage: e.target.value })} /></label>
              {flight.routing === 'transit' && (
                <>
                  <label className="text-xs">Flight 2<input className={input} value={flight.flightNo2} onChange={(e) => setFlight({ ...flight, flightNo2: e.target.value })} placeholder="EK 376" /></label>
                  <label className="text-xs">Date 2<input className={input} value={flight.date2} onChange={(e) => setFlight({ ...flight, date2: e.target.value })} placeholder="Same day if blank" /></label>
                  <label className="text-xs">Depart 2<input className={input} value={flight.depart2} onChange={(e) => setFlight({ ...flight, depart2: e.target.value })} /></label>
                  <label className="text-xs">Arrive 2<input className={input} value={flight.arrive2} onChange={(e) => setFlight({ ...flight, arrive2: e.target.value })} /></label>
                </>
              )}
            </div>
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
        <button type="button" disabled={busy} onClick={download} className="w-full rounded-md bg-[#0e2a22] py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {busy ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      <div className="overflow-auto rounded-md border border-[var(--card-border)] bg-[#e7e2d8] p-6">
        <div ref={sheet} className="mx-auto w-fit">
          {kind === 'flight' ? <FlightTicketView draft={flight} /> : <HotelVoucherView draft={hotel} />}
        </div>
      </div>
    </div>
  );
}

function needsTransit(from: string, to: string) {
  const pair = [from, to].sort().join('-');
  return pair === 'DXB-RGN' || pair === 'DXB-MDL' || pair === 'AUH-RGN' || pair === 'DOH-RGN';
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => set(!on)} className="flex items-center justify-between rounded-md border border-[var(--card-border)] px-3 py-2 text-sm">
      <span>{label}</span>
      <span className={on ? 'text-[#0e2a22] font-medium' : 'opacity-50'}>{on ? 'On' : 'Off'}</span>
    </button>
  );
}
