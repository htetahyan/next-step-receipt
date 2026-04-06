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
      
      const imgData = await toPng(element, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (1131 * pdfWidth) / 800;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.invoiceNumber || 'invoice'}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
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
             className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition-all font-medium"
           >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : 'Download PDF'}
           </button>
        </div>
      </div>

       <div className="flex justify-center p-8 bg-slate-100 dark:bg-slate-900/50 rounded-2xl overflow-x-auto shadow-inner">
         <div className="shadow-2xl bg-white print:m-0 print:shadow-none bg-invoice-paper">
            <InvoiceTemplate ref={invoiceRef} data={data} />
         </div>
      </div>
    </div>
  )
}
