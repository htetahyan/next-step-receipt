'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Download, Loader2, Calendar, Save, ChevronLeft } from 'lucide-react';
import FlightTicketTemplate, { FlightBookingData } from '@/components/FlightTicketTemplate';
import { createClient } from '@/utils/supabase/client';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import Link from 'next/link';

// Allowed departure days: Wednesday=3, Friday=5, Sunday=0
const ALLOWED_DAYS = [0, 3, 5];

function isAllowedDay(date: Date) {
  return ALLOWED_DAYS.includes(date.getDay());
}

function getNextAllowedDayFrom(date: Date, minOffset = 45): Date {
  let candidate = addDays(date, minOffset);
  while (!isAllowedDay(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

function generatePNR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

type FormValues = {
  pnr: string;
  issueDate: Date;
  passengerTitle: string;
  passengerName: string;
  tripType: 'onward' | 'return' | 'round';
  cabin: string;
  fareType: string;
  checkinBaggage: string;
  cabinBaggage: string;
  // Onward
  onwardDate: Date | null;
  onwardDepartureTime: string;
  onwardArrivalTime: string;
  onwardDuration: string;
  onwardFromCity: string;
  onwardFromAirport: string;
  onwardFromCode: string;
  onwardToCity: string;
  onwardToAirport: string;
  onwardToCode: string;
  // Return
  returnDate: Date | null;
  returnDepartureTime: string;
  returnArrivalTime: string;
  returnDuration: string;
  returnFromCity: string;
  returnFromAirport: string;
  returnFromCode: string;
  returnToCity: string;
  returnToAirport: string;
  returnToCode: string;
};

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NewFlightBookingPage() {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const { register, control, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      pnr: '',
      issueDate: new Date(),
      passengerTitle: 'MR.',
      passengerName: '',
      tripType: 'round',
      cabin: 'Economy',
      fareType: 'Non Refundable',
      checkinBaggage: '25KGS (1 piece only)',
      cabinBaggage: '7KGS (1 piece only)',
      // Onward
      onwardDate: null,
      onwardDepartureTime: '08:15',
      onwardArrivalTime: '12:30',
      onwardDuration: '6h 45min',
      onwardFromCity: 'Yangon',
      onwardFromAirport: 'Mingaladon',
      onwardFromCode: 'RGN',
      onwardToCity: 'Dubai',
      onwardToAirport: 'Dubai Intl Arpt',
      onwardToCode: 'DXB',
      // Return
      returnDate: null,
      returnDepartureTime: '14:00',
      returnArrivalTime: '22:15',
      returnDuration: '5h 45min',
      returnFromCity: 'Dubai',
      returnFromAirport: 'Dubai Intl Arpt',
      returnFromCode: 'DXB',
      returnToCity: 'Yangon',
      returnToAirport: 'Mingaladon',
      returnToCode: 'RGN',
    },
  });

  const watchAll = watch();
  const tripType = watchAll.tripType;
  const showOnward = tripType === 'onward' || tripType === 'round';
  const showReturn = tripType === 'return' || tripType === 'round';

  // Auto-calculate return date when onward date changes (for round trips)
  const handleOnwardDateChange = (date: Date | null) => {
    setValue('onwardDate', date);
    if (date && tripType === 'round') {
      const autoReturn = getNextAllowedDayFrom(date, 45);
      setValue('returnDate', autoReturn);
    }
  };

  // Generate initial PNR on mount to avoid hydration mismatch
  useEffect(() => {
    setValue('pnr', generatePNR());
  }, [setValue]);

  // Build live preview data
  const previewData: FlightBookingData = {
    pnr: watchAll.pnr || '------',
    issueDate: watchAll.issueDate ? format(watchAll.issueDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    passengerTitle: watchAll.passengerTitle || 'Mr.',
    passengerName: (watchAll.passengerName || '').toUpperCase(),
    tripType: watchAll.tripType || 'round',
    cabin: watchAll.cabin || 'Economy',
    fareType: watchAll.fareType || 'Non Refundable',
    checkinBaggage: watchAll.checkinBaggage || '25KGS (1 piece only)',
    cabinBaggage: watchAll.cabinBaggage || '7KGS (1 piece only)',
    onwardFlight: {
      date: watchAll.onwardDate ? format(watchAll.onwardDate, 'yyyy-MM-dd') : '',
      departureTime: watchAll.onwardDepartureTime || '08:15',
      arrivalTime: watchAll.onwardArrivalTime || '12:30',
      duration: watchAll.onwardDuration || '6h 45min',
      fromCity: watchAll.onwardFromCity || 'Yangon',
      fromAirport: watchAll.onwardFromAirport || 'Mingaladon',
      fromCode: watchAll.onwardFromCode || 'RGN',
      toCity: watchAll.onwardToCity || 'Dubai',
      toAirport: watchAll.onwardToAirport || 'Dubai Intl Arpt',
      toCode: watchAll.onwardToCode || 'DXB',
    },
    returnFlight: {
      date: watchAll.returnDate ? format(watchAll.returnDate, 'yyyy-MM-dd') : '',
      departureTime: watchAll.returnDepartureTime || '14:00',
      arrivalTime: watchAll.returnArrivalTime || '22:15',
      duration: watchAll.returnDuration || '5h 45min',
      fromCity: watchAll.returnFromCity || 'Dubai',
      fromAirport: watchAll.returnFromAirport || 'Dubai Intl Arpt',
      fromCode: watchAll.returnFromCode || 'DXB',
      toCity: watchAll.returnToCity || 'Yangon',
      toAirport: watchAll.returnToAirport || 'Mingaladon',
      toCode: watchAll.returnToCode || 'RGN',
    },
  };

  const handleSave = async () => {
    if (!watchAll.passengerName.trim()) {
      alert('Please enter the passenger name.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        pnr: watchAll.pnr,
        issue_date: format(watchAll.issueDate || new Date(), 'yyyy-MM-dd'),
        passenger_title: watchAll.passengerTitle,
        passenger_name: watchAll.passengerName.toUpperCase(),
        trip_type: watchAll.tripType,
        cabin: watchAll.cabin,
        fare_type: watchAll.fareType,
        checkin_baggage: watchAll.checkinBaggage,
        cabin_baggage: watchAll.cabinBaggage,
        onward_flight: {
          date: watchAll.onwardDate ? format(watchAll.onwardDate, 'yyyy-MM-dd') : null,
          departureTime: watchAll.onwardDepartureTime,
          arrivalTime: watchAll.onwardArrivalTime,
          duration: watchAll.onwardDuration,
          fromCity: watchAll.onwardFromCity,
          fromAirport: watchAll.onwardFromAirport,
          fromCode: watchAll.onwardFromCode,
          toCity: watchAll.onwardToCity,
          toAirport: watchAll.onwardToAirport,
          toCode: watchAll.onwardToCode,
        },
        return_flight: {
          date: watchAll.returnDate ? format(watchAll.returnDate, 'yyyy-MM-dd') : null,
          departureTime: watchAll.returnDepartureTime,
          arrivalTime: watchAll.returnArrivalTime,
          duration: watchAll.returnDuration,
          fromCity: watchAll.returnFromCity,
          fromAirport: watchAll.returnFromAirport,
          fromCode: watchAll.returnFromCode,
          toCity: watchAll.returnToCity,
          toAirport: watchAll.returnToAirport,
          toCode: watchAll.returnToCode,
        },
      };

      const { error } = await supabase.from('flight_bookings').insert([payload]);
      if (error) throw error;

      alert('Booking saved successfully!');
      router.push('/dashboard/flight-booking');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error saving booking');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const sanitized = (watchAll.pnr || 'booking').replace(/[/\\?%*:|"<>]/g, '-');
      await new Promise(r => setTimeout(r, 200));
      const imgData = await toPng(ticketRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      if (!imgData || imgData.length < 500) throw new Error('Capture failed');
      const img = new Image();
      img.src = imgData;
      await new Promise(r => { img.onload = r; });
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`flight-booking-${sanitized}.pdf`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const sectionHeader = (title: string) => (
    <div className="flex items-center gap-2 py-2 mb-3 border-b border-slate-200 dark:border-slate-700">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</span>
    </div>
  );

  return (
    <div className="flex h-full gap-6">
      {/* ===== SIDEBAR FORM ===== */}
      <div className="w-[430px] flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <Link href="/dashboard/flight-booking" className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 mb-1">
              <ChevronLeft className="w-3 h-3" /> Back
            </Link>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">New Flight Booking</h2>
          </div>
          <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            ✈️
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1 overflow-y-auto">

          {/* ===== BOOKING META ===== */}
          {sectionHeader('Booking Info')}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="PNR">
              <div className="flex gap-1">
                <input {...register('pnr')} className={inputCls} />
                <button type="button" onClick={() => setValue('pnr', generatePNR())} className="px-2 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 text-xs dark:border-slate-700 dark:hover:bg-slate-800">↺</button>
              </div>
            </InputField>
            <InputField label="Issue Date">
              <Controller control={control} name="issueDate" render={({ field }) => (
                <div className="relative">
                  <ReactDatePicker
                    className={inputCls}
                    onChange={(d: Date | null) => field.onChange(d)}
                    selected={field.value}
                    dateFormat="dd MMM yyyy"
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              )} />
            </InputField>
          </div>

          <InputField label="Trip Type">
            <select {...register('tripType')} className={selectCls}>
              <option value="round">Round Trip (Onward + Return)</option>
              <option value="onward">Onward Only</option>
              <option value="return">Return Only</option>
            </select>
          </InputField>

          {/* ===== PASSENGER ===== */}
          {sectionHeader('Passenger')}
          <div className="grid grid-cols-3 gap-3">
            <InputField label="Title">
              <select {...register('passengerTitle')} className={selectCls}>
                <option value="MR.">MR.</option>
                <option value="MRS.">MRS.</option>
                <option value="MS.">MS.</option>
                <option value="DR.">DR.</option>
              </select>
            </InputField>
            <div className="col-span-2">
              <InputField label="Full Name (CAPS)">
                <input {...register('passengerName')} placeholder="e.g. AUNG MYO THU" className={`${inputCls} uppercase`} />
              </InputField>
            </div>
          </div>

          {/* ===== FLIGHT DETAILS ===== */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Cabin Class">
              <select {...register('cabin')} className={selectCls}>
                <option value="Economy">Economy</option>
                <option value="Business">Business</option>
                <option value="First">First</option>
              </select>
            </InputField>
            <InputField label="Fare Type">
              <select {...register('fareType')} className={selectCls}>
                <option value="Non Refundable">Non Refundable</option>
                <option value="Refundable">Refundable</option>
              </select>
            </InputField>
          </div>

          {/* ===== BAGGAGE ===== */}
          {sectionHeader('Baggage')}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Check-in">
              <input {...register('checkinBaggage')} className={inputCls} />
            </InputField>
            <InputField label="Cabin">
              <input {...register('cabinBaggage')} className={inputCls} />
            </InputField>
          </div>

          {/* ===== ONWARD FLIGHT ===== */}
          {showOnward && (<>
            {sectionHeader('✈ Onward Flight')}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-3 border border-blue-100 dark:border-blue-900/40">
              <div className="grid grid-cols-3 gap-2">
                <InputField label="From City">
                  <input {...register('onwardFromCity')} className={inputCls} />
                </InputField>
                <InputField label="Airport">
                  <input {...register('onwardFromAirport')} className={inputCls} />
                </InputField>
                <InputField label="Code">
                  <input {...register('onwardFromCode')} className={inputCls} />
                </InputField>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <InputField label="To City">
                  <input {...register('onwardToCity')} className={inputCls} />
                </InputField>
                <InputField label="Airport">
                  <input {...register('onwardToAirport')} className={inputCls} />
                </InputField>
                <InputField label="Code">
                  <input {...register('onwardToCode')} className={inputCls} />
                </InputField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField label="Date (Wed/Fri/Sun only)">
                  <Controller control={control} name="onwardDate" render={({ field }) => (
                    <div className="relative">
                      <ReactDatePicker
                        className={inputCls}
                        onChange={(d: Date | null) => {
                          field.onChange(d);
                          handleOnwardDateChange(d);
                        }}
                        selected={field.value}
                        dateFormat="dd MMM yyyy"
                        filterDate={isAllowedDay}
                        placeholderText="Select Wed/Fri/Sun"
                        minDate={new Date()}
                      />
                      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  )} />
                </InputField>
                <InputField label="Duration">
                  <input {...register('onwardDuration')} className={inputCls} placeholder="e.g. 6h 45min" />
                </InputField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField label="Departure Time">
                  <input {...register('onwardDepartureTime')} className={inputCls} placeholder="08:15" />
                </InputField>
                <InputField label="Arrival Time">
                  <input {...register('onwardArrivalTime')} className={inputCls} placeholder="12:30" />
                </InputField>
              </div>
            </div>
          </>)}

          {/* ===== RETURN FLIGHT ===== */}
          {showReturn && (<>
            {sectionHeader('↩ Return Flight')}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-3 border border-emerald-100 dark:border-emerald-900/40">
              <div className="grid grid-cols-3 gap-2">
                <InputField label="From City">
                  <input {...register('returnFromCity')} className={inputCls} />
                </InputField>
                <InputField label="Airport">
                  <input {...register('returnFromAirport')} className={inputCls} />
                </InputField>
                <InputField label="Code">
                  <input {...register('returnFromCode')} className={inputCls} />
                </InputField>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <InputField label="To City">
                  <input {...register('returnToCity')} className={inputCls} />
                </InputField>
                <InputField label="Airport">
                  <input {...register('returnToAirport')} className={inputCls} />
                </InputField>
                <InputField label="Code">
                  <input {...register('returnToCode')} className={inputCls} />
                </InputField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField label="Date (Wed/Fri/Sun only)">
                  <Controller control={control} name="returnDate" render={({ field }) => (
                    <div className="relative">
                      <ReactDatePicker
                        className={inputCls}
                        onChange={(d: Date | null) => field.onChange(d)}
                        selected={field.value}
                        dateFormat="dd MMM yyyy"
                        filterDate={isAllowedDay}
                        placeholderText="Auto-calculated"
                        minDate={watchAll.onwardDate ? addDays(watchAll.onwardDate, 1) : new Date()}
                      />
                      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  )} />
                </InputField>
                <InputField label="Duration">
                  <input {...register('returnDuration')} className={inputCls} placeholder="e.g. 5h 45min" />
                </InputField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField label="Departure Time">
                  <input {...register('returnDepartureTime')} className={inputCls} placeholder="14:00" />
                </InputField>
                <InputField label="Arrival Time">
                  <input {...register('returnArrivalTime')} className={inputCls} placeholder="22:15" />
                </InputField>
              </div>
            </div>
          </>)}
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Booking'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="w-full border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
          
          {/* Quick Hotel Booking */}
          <Link
            href={`/dashboard/hotel-booking/new?guestName=${encodeURIComponent(watchAll.passengerTitle + watchAll.passengerName.toUpperCase())}&checkIn=${watchAll.onwardDate ? format(watchAll.onwardDate, 'yyyy-MM-dd') : ''}&checkOut=${watchAll.returnDate ? format(watchAll.returnDate, 'yyyy-MM-dd') : ''}`}
            target="_blank"
            className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
          >
            🏢 Quick Hotel Booking
          </Link>
        </div>
      </div>

      {/* ===== LIVE PREVIEW ===== */}
      <div className="flex-1 overflow-auto bg-gray-200/50 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 flex items-start justify-center p-8">
        <div className="shadow-2xl scale-[0.55] sm:scale-[0.65] xl:scale-[0.8] transform origin-top mb-[-400px]">
          <FlightTicketTemplate ref={ticketRef} data={previewData} />
        </div>
      </div>
    </div>
  );
}
