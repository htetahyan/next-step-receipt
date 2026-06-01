'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { FileText, Search, Trash2, Loader2, Eye, X } from 'lucide-react'
import Link from 'next/link'
import { deleteInvoice } from '@/app/actions/invoices'

export default function InvoiceList({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const filtered = useMemo(() => {
    if (!search) return invoices
    const q = search.toLowerCase()
    return invoices.filter(i => 
      i.invoice_number.toLowerCase().includes(q) || 
      i.customer?.name?.toLowerCase().includes(q)
    )
  }, [invoices, search])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, currentPage])

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#1e293b] dark:bg-[#0f172a] overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
           <div className="relative max-w-sm flex-1">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-slate-400" />
             </div>
             <input 
               type="text" 
               placeholder="Search invoices by number or client..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all" 
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80">
                  <X className="w-4 h-4" />
                </button>
              )}
           </div>
           <div className="text-xs font-mono opacity-60">Total: {filtered.length} matching</div>
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
              {paginatedItems.map((invoice: any) => (
                <tr key={invoice.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 shadow-sm">
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
              {paginatedItems.length === 0 && (
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 py-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs opacity-60 font-mono">
                  Showing <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                  <span className="font-semibold">{filtered.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-semibold disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-[0.95]"
                  >
                    Previous
                  </button>
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) {
                      start = Math.max(1, end - maxVisible + 1);
                    }
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                    return pages.map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.05] active:scale-[0.95] ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white border border-emerald-600'
                            : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ));
                  })()}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-semibold disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-[0.95]"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

