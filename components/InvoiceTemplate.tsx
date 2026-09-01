import React, { forwardRef } from 'react';

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  vatRate?: number;
  isVatExempt?: boolean;
  paymentMethod?: string;
  // Dynamic business details from settings
  companyName?: string;
  companyAddress?: string;
  bankName?: string;
  bankBranch?: string;
  bankIban?: string;
  bankAccountNo?: string;
};

type Props = {
  data: InvoiceData;
};

const InvoiceTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const companyName = data.companyName || "NextStep Travel & Tourism FZC LLC";
  const companyAddress = data.companyAddress || "Office No 4B, 3rd Floor IBIS Hotel Business Center, Al Rigga, Deira Dubai, United Arab Emirates";
  const bankName = data.bankName || "Mashreq Bank";
  const bankBranch = data.bankBranch || "Deira, Dubai";
  const bankIban = data.bankIban || "AE300330000019101789314";
  const bankAccountNo = data.bankAccountNo || "019101789314";

  return (
    <div 
      ref={ref} 
      className="bg-white text-black p-12 w-[800px] min-h-[1131px] mx-auto box-border" 
      style={{ 
        fontFamily: 'serif',
        lineHeight: '1.4'
      }}
    >
      <div className="flex flex-col items-center mb-8">
        <img 
          src="/logo.jpg" 
          alt="Company Logo" 
          className="h-20 w-auto object-contain mb-4" 
        />
        <h1 className="text-2xl font-bold text-[#006666] tracking-tight">{companyName}</h1>
        <h2 className="text-2xl font-bold mt-2 tracking-widest border-b-2 border-black px-8">INVOICE</h2>
      </div>

      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col flex-1 pl-1 border-l-4 border-emerald-900">
          <span className="text-xs font-bold uppercase mb-2 text-emerald-900">Customer Details</span>
          <div className="space-y-1.5 text-sm font-bold">
            <div className="flex">
              <span className="w-16">Name</span>: <span className="ml-2 border-b border-gray-300 flex-1 min-w-[250px] font-normal">{data.customerName || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-16">Email</span>: <span className="ml-2 border-b border-gray-300 flex-1 min-w-[250px] font-normal font-sans text-xs">{data.customerEmail || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-16">Phone</span>: <span className="ml-2 border-b border-gray-300 flex-1 min-w-[250px] font-normal">{data.customerPhone || '-'}</span>
            </div>
          </div>
        </div>

        <div className="min-w-[200px] border-2 border-black flex flex-col font-bold shadow-sm">
           <div className="flex border-b-2 border-black bg-emerald-50/50">
             <span className="w-20 px-3 py-2 border-r-2 border-black">NO</span>
             <span className="flex-1 px-3 py-2 text-right font-normal bg-white tracking-widest">{data.invoiceNumber || '-'}</span>
           </div>
           <div className="flex">
             <span className="w-20 px-3 py-2 border-r-2 border-black bg-emerald-50/50">DATE</span>
             <span className="flex-1 px-3 py-2 text-right font-normal tracking-wide">{data.date || '-'}</span>
           </div>
        </div>
      </div>

      <div className="h-1 bg-black w-full mb-1"></div>
      <div className="h-[2px] border-t border-black w-full mb-8"></div>

      <table className="w-full border-collapse border-2 border-black text-sm mb-12 text-center text-black">
        <thead>
          <tr className="bg-emerald-50 font-bold border-b-2 border-black text-emerald-900">
            <th className="border-r-2 border-black py-3 px-3 w-[15%]">Qty</th>
            <th className="border-r-2 border-black py-3 px-3 w-[45%] text-left">Description</th>
            <th className="border-r-2 border-black py-3 px-3 w-[20%]">Rate AED</th>
            <th className="py-3 px-3 w-[20%]">Amount AED</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {data.items.length > 0 ? (
            data.items.map((item, index) => (
              <tr key={item.id} className="min-h-[28px] border-b border-gray-200">
                <td className="border-r-2 border-black py-2.5 px-3">{item.quantity}</td>
                <td className="border-r-2 border-black py-2.5 px-3 text-left font-sans italic text-slate-700">{item.description}</td>
                <td className="border-r-2 border-black py-2.5 px-3 text-right">{(Number(item.rate) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">{(Number(item.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))
          ) : (
             <tr className="h-[28px]">
                <td className="border-r-2 border-black py-2.5 px-3"></td>
                <td className="border-r-2 border-black py-2.5 px-3 text-left"></td>
                <td className="border-r-2 border-black py-2.5 px-3 text-right"></td>
                <td className="py-2.5 px-3 text-right"></td>
              </tr>
          )}

          {/* Flexible spacing */}
          <tr className="flex-1 min-h-[350px]">
            <td className="border-r-2 border-black"></td>
            <td className="border-r-2 border-black"></td>
            <td className="border-r-2 border-black"></td>
            <td className=""></td>
          </tr>

          <tr className="font-bold border-t-2 border-black bg-emerald-50/20">
            <td colSpan={2} className="border-r-2 border-black"></td>
            <td className="border-r-2 border-black py-3 px-3 text-right uppercase text-emerald-900">Subtotal</td>
            <td className="py-3 px-3 text-right">{(Number(data.subtotal) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr className="border-t border-black bg-white">
            <td colSpan={2} className="border-r-2 border-black"></td>
            <td className="border-r-2 border-black py-3 px-3 text-right font-bold uppercase text-emerald-900 bg-emerald-50/50">VAT {data.vatRate || 5}%</td>
            <td className="py-3 px-3 text-right border-b-2 border-black">{(Number(data.vatAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr className="bg-[#064e3b] text-white font-bold border-2 border-black">
            <td colSpan={2} className="border-r-2 border-emerald-800"></td>
            <td className="border-r-2 border-emerald-800 py-3 px-3 text-right uppercase tracking-widest text-lg">Total AED</td>
            <td className="py-3 px-3 text-right text-lg border-double border-b-4 border-white">{(Number(data.totalAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-sm font-bold mb-8 italic text-emerald-900">
        Thank you for your business!
      </div>
      
      <div className="h-1 border-t-2 border-black w-full mb-6"></div>

      <div className="grid grid-cols-2 gap-12 text-sm leading-relaxed mb-auto">
        <div className="space-y-1">
           <p className="font-bold underline mb-3 text-emerald-900 uppercase tracking-wider">AED Account details:</p>
           <div className="space-y-1">
             <div className="flex"><span className="text-emerald-900 font-bold w-24">Payable:</span> <span className="font-bold flex-1">{companyName}</span></div>
             <div className="flex"><span className="text-emerald-900 font-bold w-24">IBAN#:</span> <span className="font-bold flex-1">{bankIban}</span></div>
             <div className="flex"><span className="text-emerald-900 font-bold w-24">Bank:</span> <span className="font-bold flex-1">{bankName}</span></div>
             <div className="flex"><span className="text-emerald-900 font-bold w-24">Branch:</span> <span className="font-bold flex-1">{bankBranch}</span></div>
             <div className="flex"><span className="text-emerald-900 font-bold w-24">Account No:</span> <span className="font-bold flex-1">{bankAccountNo}</span></div>
           </div>
        </div>
        
        <div className="flex flex-col justify-start">
             {data.paymentMethod && (
                <div className="mt-8 p-4 border-2 border-[#064e3b] rounded-lg inline-block self-end bg-emerald-50/30">
                  <span className="text-emerald-900 font-extrabold uppercase text-xs tracking-tighter mr-3">Payment Method</span>
                  <span className="font-black text-emerald-900 uppercase text-lg italic">{data.paymentMethod}</span>
                </div>
             )}
        </div>
      </div>

      <div className="text-[11px] text-center text-gray-500 mt-20 border-t pt-6 font-sans">
        {companyAddress}
      </div>
    </div>
  );
});


InvoiceTemplate.displayName = 'InvoiceTemplate';

export default InvoiceTemplate;
