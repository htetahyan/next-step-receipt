'use client'

import React, { useRef, useState } from 'react'
import { Printer, Download, Loader2, MessageCircle, Copy, Check, FileText } from 'lucide-react'
import { toast } from 'sonner'
import InvoiceTemplate, { InvoiceData } from '@/components/InvoiceTemplate'

export default function InvoiceActions({ data }: { data: InvoiceData }) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

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
      toast.success('Invoice PDF downloaded');
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
      toast.error(`Error generating PDF: ${e.message || 'Please try again'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
     window.print()
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setHasCopied(true);
      toast.success('Invoice link copied to clipboard!');
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const formattedAmount = (Number(data.totalAmount) || 0).toLocaleString();
    const invoiceUrl = typeof window !== 'undefined' ? window.location.href : '';
    const message = `Hello ${data.customerName || 'Customer'},\n\nHere are the details for your Invoice #${data.invoiceNumber || ''}:\n• Total Amount: AED ${formattedAmount}\n• Date: ${data.date || 'N/A'}\n\nView invoice: ${invoiceUrl}\n\nThank you for choosing NextStep Travel & Tourism!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Action Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden border-b border-[var(--card-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center text-[#D97757] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-[var(--foreground)] flex items-center gap-2">
              Invoice <span className="font-mono text-[#D97757]">{data.invoiceNumber}</span>
            </h1>
            <p className="text-xs opacity-60">
              Customer: <span className="font-semibold text-[var(--foreground)]">{data.customerName || 'N/A'}</span> • AED {(Number(data.totalAmount) || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Share */}
          <button 
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Share WhatsApp</span>
          </button>

          {/* Copy Link */}
          <button 
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer"
            title="Copy Public Link"
          >
            {hasCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
            <span>{hasCopied ? 'Copied' : 'Copy Link'}</span>
          </button>

          {/* Print */}
          <button 
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--sidebar-bg)] px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 opacity-60" />
            <span>Print</span>
          </button>

          {/* Download PDF */}
          <button 
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D97757] hover:opacity-90 text-[#F5F4EF] px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Invoice Paper Canvas */}
      <div className="flex justify-center p-6 sm:p-8 bg-slate-100 dark:bg-slate-900/50 rounded-2xl overflow-x-auto shadow-inner min-h-[600px] border border-[var(--card-border)]">
        <div className="shadow-md bg-white print:m-0 print:shadow-none bg-invoice-paper scale-[0.6] sm:scale-[0.7] lg:scale-[0.8] xl:scale-100 transform origin-top mb-[-200px]">
          <InvoiceTemplate ref={invoiceRef} data={data} />
        </div>
      </div>
    </div>
  );
}
