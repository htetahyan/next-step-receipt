'use client'

import React, { useState } from 'react'
import { FileText, Search, Trash2, Loader2, Eye } from 'lucide-react'
import Link from 'next/link'
import { deleteInvoice } from '@/app/actions/invoices'

export default function InvoiceList({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${number}?`)) return
    setIsDeleting(id)
    const res = await deleteInvoice(id)
    if (res.error) {
       alert(res.error)
    } else {
       setInvoices(invoices.filter(i => i.id !== id))
    }
    setIsDeleting(null)
  }

  const filtered = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
    i.customer?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#1e293b] dark:bg-[#0f172a] overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
           <div className="relative max-w-sm">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-slate-400" />
             </div>
             <input 
               type="text" 
               placeholder="Search invoices by number or client..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all" 
              />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-5 font-bold">Invoice NO.</th>
                <th className="px-6 py-5 font-bold">Client Name</th>
                <th className="px-6 py-5 font-bold">Amount (AED)</th>
                <th className="px-6 py-5 font-bold">Issue Date</th>
                <th className="px-6 py-5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((invoice: any) => (
                <tr key={invoice.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{invoice.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="font-medium text-slate-700 dark:text-slate-300">{invoice.customer?.name}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    {Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-slate-500">{invoice.date}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 isolate">
                      <Link 
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all font-bold"
                        title="View & Download"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <button 
                        disabled={isDeleting === invoice.id}
                        onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                        title="Delete Permanently"
                      >
                        {isDeleting === invoice.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                     <div className="flex flex-col items-center gap-3">
                         <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full">
                            <FileText className="h-10 w-10 text-slate-300" />
                         </div>
                         <p className="font-semibold text-emerald-900 dark:text-emerald-400">No invoices found matching your criteria.</p>
                         <Link href="/dashboard/invoices/new" className="text-emerald-600 font-black hover:underline tracking-tight">Create an invoice instead</Link>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  )
}
