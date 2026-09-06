'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { FileText, Search, Trash2, Loader2, Eye, X } from 'lucide-react'
import Link from 'next/link'
import { deleteInvoice } from '@/app/actions/invoices'
import { toast } from 'sonner'
import Pagination from './Pagination'
import { UserProfile, checkPermission } from '@/lib/auth-permissions'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function InvoiceList({
  initialInvoices,
  profile,
}: {
  initialInvoices: any[];
  profile?: UserProfile | null;
}) {
  const canDelete = checkPermission(profile || null, 'invoices', 'delete');
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(deleteTarget.id)
    const res = await deleteInvoice(deleteTarget.id)
    if (res.error) {
       toast.error(res.error)
    } else {
       setInvoices(invoices.filter(i => i.id !== deleteTarget.id))
       toast.success('Invoice deleted')
    }
    setIsDeleting(null)
    setDeleteTarget(null)
  }

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Reset page when search or date filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, startDate, endDate])

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      // 1. Text Search
      if (search) {
        const q = search.toLowerCase()
        const matchText = i.invoice_number.toLowerCase().includes(q) || i.customer?.name?.toLowerCase().includes(q)
        if (!matchText) return false
      }
      
      // 2. Start Date Filter
      if (startDate && i.date < startDate) {
        return false
      }
      
      // 3. End Date Filter
      if (endDate && i.date > endDate) {
        return false
      }

      return true
    })
  }, [invoices, search, startDate, endDate])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, currentPage])

  return (
    <div className="card-anthropic overflow-hidden">
        <div className="p-3 border-b border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
           <div className="relative max-w-sm flex-1 w-full">
             <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
               <Search className="h-4 w-4 opacity-40" />
             </div>
             <input 
               type="text" 
               placeholder="Search invoices by number or client..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full pl-9 pr-9 h-8.5 text-xs rounded-lg border border-[var(--card-border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]" 
              />
              {search && (
                <div className="absolute right-2.5 inset-y-0 flex items-center">
                  <button onClick={() => setSearch('')} className="opacity-40 hover:opacity-80 p-0.5 cursor-pointer flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
           </div>

           <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
             <div className="flex items-center gap-1.5 text-xs">
               <span className="opacity-60 text-[11px]">From:</span>
               <input
                 type="date"
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
                 className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2 h-8 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
               />
             </div>

             <div className="flex items-center gap-1.5 text-xs">
               <span className="opacity-60 text-[11px]">To:</span>
               <input
                 type="date"
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
                 className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2 h-8 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
               />
             </div>

             {(startDate || endDate) && (
               <button
                 onClick={() => { setStartDate(''); setEndDate(''); }}
                 className="px-2 h-8 rounded-lg hover:bg-[var(--sidebar-bg)] text-xs text-red-500 font-semibold cursor-pointer"
                 title="Clear Date Filters"
               >
                 Clear
               </button>
             )}

             <div className="text-[11px] font-mono opacity-60 flex-shrink-0 ml-1">Total: {filtered.length}</div>
           </div>
        </div>
        <div className="overflow-x-auto max-h-[calc(100vh-230px)] relative">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] backdrop-blur-md text-[10px] uppercase tracking-wider opacity-90 shadow-xs">
              <tr>
                <th className="px-4 py-2 font-semibold">Invoice NO.</th>
                <th className="px-4 py-2 font-semibold">Client Name</th>
                <th className="px-4 py-2 font-semibold">Amount (AED)</th>
                <th className="px-4 py-2 font-semibold">Issue Date</th>
                <th className="px-4 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems.map((invoice: any) => (
                <tr key={invoice.id} className="group hover:bg-[var(--sidebar-bg)] transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-[#D97757]/10 text-[#D97757] font-semibold text-xs">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-mono font-bold text-xs text-[#D97757]">{invoice.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs font-medium">
                     <span>{invoice.customer?.name || '—'}</span>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono font-bold">
                    {(Number(invoice.total_amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono opacity-70">
                     <div>{invoice.date}</div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Link 
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="p-1 rounded-md text-slate-400 hover:text-[#D97757] hover:bg-[var(--sidebar-bg)] transition-all cursor-pointer"
                        title="View & Download"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {canDelete && (
                        <button 
                          disabled={isDeleting === invoice.id}
                          onClick={() => setDeleteTarget({ id: invoice.id, number: invoice.invoice_number })}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-[var(--sidebar-bg)] transition-all disabled:opacity-50 cursor-pointer"
                          title="Delete Permanently"
                        >
                          {isDeleting === invoice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Invoice"
          itemType="invoice"
          itemName={deleteTarget?.number || ''}
          isDeleting={!!isDeleting}
          description="Are you sure you want to delete this invoice? This action cannot be undone."
        />
    </div>
  )
}

