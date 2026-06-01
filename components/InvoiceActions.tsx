'use client'

import React, { useRef } from 'react'
import { Printer, Download, Loader2 } from 'lucide-react'
import InvoiceTemplate, { InvoiceData } from '@/components/InvoiceTemplate'

export default function InvoiceActions({ data }: { data: InvoiceData }) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const element = invoiceRef.current;
      
      // Sanitizing filename (Windows does not allow / in filenames)
      const sanitizedInvoiceNo = (data.invoiceNumber || 'invoice').replace(/[/\\?%*:|"<>]/g, '-');

      // Slight delay to ensure any dynamic content or fonts are fully rendered
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
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (1131 * pdfWidth) / 800;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${sanitizedInvoiceNo}.pdf`);
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Viewing Invoice: {data.invoiceNumber}</h1>
        <div className="flex items-center gap-3">
           <button 
             onClick={handlePrint}
             className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all font-medium"
           >
              <Printer className="h-4 w-4" />
              Print Invoice
           </button>
           <button 
             onClick={handleDownloadPdf}
             disabled={isGenerating}
             className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-600 disabled:opacity-50 transition-all font-medium"
           >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : 'Download PDF'}
           </button>
        </div>
      </div>

       <div className="flex justify-center p-8 bg-slate-100 dark:bg-slate-900/50 rounded-2xl overflow-x-auto shadow-inner min-h-[600px]">
         {/* Added scaling container to match the "New Invoice" rendering environment which works */}
         <div className="shadow-md bg-white print:m-0 print:shadow-none bg-invoice-paper scale-[0.6] sm:scale-[0.7] lg:scale-[0.8] xl:scale-100 transform origin-top mb-[-200px]">
            <InvoiceTemplate ref={invoiceRef} data={data} />
         </div>
      </div>
    </div>
  );
}
