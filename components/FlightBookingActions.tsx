'use client'

import React, { useRef } from 'react'
import { Printer, Download, Loader2 } from 'lucide-react'
import FlightTicketTemplate, { FlightBookingData } from '@/components/FlightTicketTemplate'

export default function FlightBookingActions({ data }: { data: FlightBookingData }) {
  const ticketRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const element = ticketRef.current;
      const sanitizedName = (data.pnr || 'booking').replace(/[/\\?%*:|"<>]/g, '-');

      await new Promise(resolve => setTimeout(resolve, 200));

      const imgData = await toPng(element, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      if (!imgData || imgData.length < 500) {
        throw new Error('Capture failed - generated image is too small.');
      }

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`flight-booking-${sanitizedName}.pdf`);
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      alert(`Error generating PDF: ${e.message || 'Please try again'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
     window.print()
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Flight Booking: {data.pnr}</h1>
        <div className="flex items-center gap-3">
           <button 
             onClick={handlePrint}
             className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all"
           >
              <Printer className="h-4 w-4" />
              Print
           </button>
           <button 
             onClick={handleDownloadPdf}
             disabled={isGenerating}
             className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
           >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : 'Download PDF'}
           </button>
        </div>
      </div>

       <div className="flex justify-center p-8 bg-slate-100 dark:bg-slate-900/50 rounded-2xl overflow-x-auto shadow-inner min-h-[600px]">
         <div className="shadow-2xl bg-white print:m-0 print:shadow-none">
            <FlightTicketTemplate ref={ticketRef} data={data} />
         </div>
      </div>
    </div>
  );
}
