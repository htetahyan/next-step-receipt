'use client'

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Download, Loader2, Save, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import HotelTicketTemplate, { HotelBookingData } from '@/components/HotelTicketTemplate';
import { createClient } from '@/utils/supabase/client';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';

function generateBookingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const datePart = format(new Date(), 'ddMMyyyy');
  return `DT-${datePart}-${rand}`;
}

type FormValues = {
  bookingId: string;
  bookingDate: Date;
  hotelName: string;
  hotelAddress: string;
  checkIn: Date | null;
  checkOut: Date | null;
  totalNights: number;
  noOfRooms: number;
  roomTypeBoard: string;
  guestTitle: string;
  guestName: string;
  adults: number;
  children: number;
  infants: number;
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function HotelBookingForm() {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Try parsing the query params
  const rawGuestName = searchParams.get('guestName') || '';
  let initialTitle = 'MR.';
  let initialName = '';

  // Parse title and name from incoming string (e.g., "MR.AUNG MYO THU")
  const titleMatch = rawGuestName.match(/^(MR\.|MRS\.|MS\.|DR\.)(.*)$/i);
  if (titleMatch) {
    initialTitle = titleMatch[1].toUpperCase();
    initialName = titleMatch[2].toUpperCase();
  } else {
    initialName = rawGuestName.toUpperCase();
  }
  const checkInParam = searchParams.get('checkIn');
  const checkOutParam = searchParams.get('checkOut');

  const initialCheckIn = checkInParam ? new Date(checkInParam) : null;
  const initialCheckOut = checkOutParam ? new Date(checkOutParam) : null;

  // Validate dates
  const checkInValid = initialCheckIn && !isNaN(initialCheckIn.getTime());
  const checkOutValid = initialCheckOut && !isNaN(initialCheckOut.getTime());

  let initialNights = 1;
  if (checkInValid && checkOutValid) {
     const diff = differenceInDays(initialCheckOut, initialCheckIn);
     if (diff > 0) initialNights = diff;
  }

  const { register, control, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      bookingId: '',
      bookingDate: new Date(),
      hotelName: 'Park Regis Kris Kin Hotel',
      hotelAddress: 'Sheikh Khalifa Bin Zayed St - opp. Burjuman Center - Bur Dubai - Dubai - United Arab Emirates',
      checkIn: checkInValid ? initialCheckIn : null,
      checkOut: checkOutValid ? initialCheckOut : null,
      totalNights: initialNights,
      noOfRooms: 1,
      roomTypeBoard: 'Standard Single Room',
      guestTitle: initialTitle,
      guestName: initialName,
      adults: 1,
      children: 0,
      infants: 0,
    },
  });

  // Generate initial booking ID on mount to avoid hydration mismatch
  useEffect(() => {
    setValue('bookingId', generateBookingId());
  }, [setValue]);

  const watchAll = watch();

  // Auto calculate nights
  useEffect(() => {
    if (watchAll.checkIn && watchAll.checkOut) {
      const diff = differenceInDays(watchAll.checkOut, watchAll.checkIn);
      setValue('totalNights', diff > 0 ? diff : 0);
    }
  }, [watchAll.checkIn, watchAll.checkOut, setValue]);

  const previewData: HotelBookingData = {
    bookingId: watchAll.bookingId || '------',
    bookingDate: watchAll.bookingDate ? format(watchAll.bookingDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    hotelName: watchAll.hotelName || 'Hotel Name',
    hotelAddress: watchAll.hotelAddress || 'Hotel Address',
    checkIn: watchAll.checkIn ? format(watchAll.checkIn, 'yyyy-MM-dd') : '-',
    checkOut: watchAll.checkOut ? format(watchAll.checkOut, 'yyyy-MM-dd') : '-',
    totalNights: watchAll.totalNights || 0,
    noOfRooms: watchAll.noOfRooms || 1,
    roomTypeBoard: watchAll.roomTypeBoard || 'Standard Single Room',
    guestName: (watchAll.guestTitle || 'MR.') + (watchAll.guestName || 'GUEST NAME').toUpperCase(),
    adults: watchAll.adults || 1,
    children: watchAll.children || 0,
    infants: watchAll.infants || 0,
  };

  const handleSave = async () => {
    if (!watchAll.guestName.trim()) {
      alert('Please enter guest name.');
      return;
    }
    if (!watchAll.checkIn || !watchAll.checkOut) {
      alert('Please select check in and check out dates.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        booking_id: watchAll.bookingId,
        booking_date: format(watchAll.bookingDate, 'yyyy-MM-dd'),
        hotel_name: watchAll.hotelName,
        hotel_address: watchAll.hotelAddress,
        check_in: format(watchAll.checkIn, 'yyyy-MM-dd'),
        check_out: format(watchAll.checkOut, 'yyyy-MM-dd'),
        total_nights: watchAll.totalNights,
        no_of_rooms: watchAll.noOfRooms,
        room_type_board: watchAll.roomTypeBoard,
        guest_name: (watchAll.guestTitle + watchAll.guestName).toUpperCase(),
        adults: watchAll.adults,
        children: watchAll.children,
        infants: watchAll.infants,
      };

      const { error } = await supabase.from('hotel_bookings').insert([payload]);
      if (error) throw error;

      alert('Hotel booking saved successfully!');
      router.push('/dashboard/hotel-booking');
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
      
      const sanitized = (watchAll.bookingId || 'booking').replace(/[/\\?%*:|"<>]/g, '-');
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
      pdf.save(`hotel-booking-${sanitized}.pdf`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-[430px] flex-shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-y-auto">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <Link href="/dashboard/hotel-booking" className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 mb-1">
              <ChevronLeft className="w-3 h-3" /> Back
            </Link>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">New Hotel Booking</h2>
          </div>
          <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            🏢
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* Booking Meta */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Booking ID">
              <div className="flex gap-1">
                <input {...register('bookingId')} className={inputCls} />
                <button type="button" onClick={() => setValue('bookingId', generateBookingId())} className="px-2 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 text-xs dark:border-slate-700 dark:hover:bg-slate-800">↺</button>
              </div>
            </InputField>
            <InputField label="Booking Date">
              <Controller control={control} name="bookingDate" render={({ field }) => (
                <div className="relative">
                  <ReactDatePicker className={inputCls} onChange={(d: Date | null) => field.onChange(d)} selected={field.value} dateFormat="yyyy-MM-dd" />
                  <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              )} />
            </InputField>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700 space-y-3">
             <InputField label="Hotel Name">
               <input {...register('hotelName')} className={inputCls} />
             </InputField>
             <InputField label="Hotel Address">
               <textarea {...register('hotelAddress')} className={`${inputCls} resize-none h-16`} />
             </InputField>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <InputField label="Check In">
               <Controller control={control} name="checkIn" render={({ field }) => (
                 <div className="relative">
                   <ReactDatePicker className={inputCls} onChange={(d: Date | null) => field.onChange(d)} selected={field.value} dateFormat="yyyy-MM-dd" />
                   <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                 </div>
               )} />
             </InputField>
             <InputField label="Check Out">
               <Controller control={control} name="checkOut" render={({ field }) => (
                 <div className="relative">
                   <ReactDatePicker className={inputCls} onChange={(d: Date | null) => field.onChange(d)} selected={field.value} dateFormat="yyyy-MM-dd" minDate={watchAll.checkIn || undefined} />
                   <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                 </div>
               )} />
             </InputField>
          </div>
          
          <div className="grid grid-cols-2 gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
             <InputField label="Total Night(s)">
               <input type="number" {...register('totalNights', { valueAsNumber: true })} className={inputCls} readOnly />
             </InputField>
             <InputField label="No. Of Rooms">
               <input type="number" {...register('noOfRooms', { valueAsNumber: true })} className={inputCls} />
             </InputField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <InputField label="Title">
              <select {...register('guestTitle')} className={inputCls}>
                <option value="MR.">MR.</option>
                <option value="MRS.">MRS.</option>
                <option value="MS.">MS.</option>
                <option value="DR.">DR.</option>
              </select>
            </InputField>
            <div className="col-span-2">
              <InputField label="Guest Name (CAPS)">
                <input {...register('guestName')} className={`${inputCls} uppercase`} />
              </InputField>
            </div>
          </div>
          
          <InputField label="Room Type / Board">
            <input {...register('roomTypeBoard')} className={inputCls} />
          </InputField>

          <div className="grid grid-cols-3 gap-3">
             <InputField label="Adults">
               <input type="number" {...register('adults', { valueAsNumber: true })} className={inputCls} min="1" />
             </InputField>
             <InputField label="Children">
               <input type="number" {...register('children', { valueAsNumber: true })} className={inputCls} min="0" />
             </InputField>
             <InputField label="Infants">
               <input type="number" {...register('infants', { valueAsNumber: true })} className={inputCls} min="0" />
             </InputField>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Hotel Booking'}
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
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-200/50 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 flex items-start justify-center p-8">
        <div className="shadow-2xl scale-[0.60] sm:scale-[0.70] xl:scale-[0.80] transform origin-top mb-[-400px] bg-white">
          <HotelTicketTemplate ref={ticketRef} data={previewData} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <HotelBookingForm />
    </Suspense>
  )
}
