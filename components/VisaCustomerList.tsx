'use client'

import React, { useState, useMemo } from 'react'
import { Plus, Search, Loader2, X, MoreVertical, Edit2, Trash2, ExternalLink, Calendar, Users, Briefcase, FileText } from 'lucide-react'
import { updateVisaCustomer, deleteVisaCustomer } from '@/app/actions/visa-customers'
import Link from 'next/link'
import DocumentModal from './DocumentModal'

const VISA_SUPPLIERS = ['DAHR', 'Incel Tourism', 'AKSM', 'Surprise Tourism', 'Hatta Sky', 'Other'];
const VISA_MODES = [
  '30 Visit Visa', '60 Visit Visa', 'Visa Change by Bus', 'Visa Change by Air', 
  'Transit Visa', 'Inside One Month', 'B2B', 'Multi Entry Visa', 
  'By Bus to Oman', '30 Days Oman Visa', 'Other'
];
const DURATIONS = ['30 Days', '60 Days', '48 Hrs Transit', '30 Days Multiple', '60 Days Multi', 'Other'];

export default function VisaCustomerList({ initialCustomers }: { initialCustomers: any[] }) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isQuickAdding, setIsQuickAdding] = useState(false)
  
  const [docCustomer, setDocCustomer] = useState<any>(null)

  const handleEdit = (customer: any) => {
    setCurrentCustomer(customer)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the record for ${name}?`)) return
    setIsDeleting(id)
    const res = await deleteVisaCustomer(id)
    if (res.error) {
      alert(res.error)
    } else {
      setCustomers(customers.filter(c => c.id !== id))
    }
    setIsDeleting(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentCustomer) return; // This component only handles edits, creation is done on the /new page

    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const res = await updateVisaCustomer(currentCustomer.id, formData)
    if (res.error) {
      alert(res.error)
    } else {
      // Optimistic update
      const updated = customers.map(c => {
        if (c.id === currentCustomer.id) {
          return {
            ...c,
            monthly_count: formData.get('monthly_count'),
            mode_of_visa: formData.get('mode_of_visa'),
            customer_name: formData.get('customer_name'),
            visa_issued_date: formData.get('visa_issued_date') || null,
            travel_date: formData.get('travel_date') || null,
            visa_expiry_date: formData.get('visa_expiry_date'),
            phone_contact: formData.get('phone_contact'),
            visa_supplier: formData.get('visa_supplier'),
            email_address: formData.get('email_address'),
            passport_no: formData.get('passport_no'),
            visa_duration: formData.get('visa_duration'),
            amount: parseFloat(formData.get('amount') as string) || 0,
            discount_agent_fees: parseFloat(formData.get('discount_agent_fees') as string) || 0,
            receiving_amount: parseFloat(formData.get('receiving_amount') as string) || 0,
            visa_fees_to_supplier: parseFloat(formData.get('visa_fees_to_supplier') as string) || 0,
            refund: formData.get('refund'),
            payment_method: formData.get('payment_method'),
            balance: formData.get('balance'),
            comments: formData.get('comments'),
            referred_by: formData.get('referred_by'),
            remark: formData.get('remark'),
            status: formData.get('status') || 'Open',
          }
        }
        return c
      })
      setCustomers(updated)
      setIsModalOpen(false)
    }
    setIsSaving(false)
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = 
        c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.passport_no?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'case closed':
      case 'file closed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      case 'refunded':
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'reapply':
      case 'employment visa changed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-sans)' }}>Visa Customers</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and track your visa applications.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700/10 text-emerald-700 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-emerald-700/20 active:scale-95 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-700/20"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </button>
          <Link 
            href="/dashboard/visa-customers/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-800 active:scale-95 shadow-sm"
          >
            Full Form
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-transparent py-2">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Case Closed">Case Closed</option>
          <option value="File Closed">File Closed</option>
          <option value="Employment Visa Changed">Employment Visa Changed</option>
          <option value="Refunded">Refunded</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#18181B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-[#18181B]">
              <tr>
                <th scope="col" className="px-6 py-3">ID / Month</th>
                <th scope="col" className="px-6 py-3 max-w-[200px]">Client Details</th>
                <th scope="col" className="px-6 py-3">Visa / Supplier</th>
                <th scope="col" className="px-6 py-3">Passport / Duration</th>
                <th scope="col" className="px-6 py-3 text-right">Financials</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full">
                        <Users className="h-10 w-10 text-slate-300" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-base">No visa records found.</p>
                      <Link href="/dashboard/visa-customers/new" className="text-emerald-700 font-bold hover:underline">Add the first one</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="group bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-[#27272A] transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{customer.customer_id}</div>
                      <div className="text-xs mt-1 text-slate-500">{customer.monthly_count || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{customer.customer_name}</div>
                      <div className="text-xs mt-1 text-slate-500 flex items-center gap-1">
                        {customer.phone_contact && <span>{customer.phone_contact}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{customer.mode_of_visa || '-'}</div>
                      <div className="text-xs mt-1 text-slate-500">{customer.visa_supplier || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-300">{customer.passport_no || '-'}</div>
                      <div className="text-xs mt-1 text-slate-500">{customer.visa_duration || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-900 dark:text-white">{Number(customer.amount || 0).toLocaleString()} AED</div>
                      <div className="text-xs mt-1 text-emerald-600">Rec: {Number(customer.receiving_amount || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(customer.status)}`}>
                        {customer.status || 'Open'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setDocCustomer(customer)}
                          className="p-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors"
                          title="Documents"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="p-2 mr-1 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors"
                          title="Quick Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id, customer.customer_name)}
                          disabled={isDeleting === customer.id}
                          className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          {isDeleting === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && currentCustomer && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container max-w-4xl scale-in-center" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between flex-shrink-0 bg-[var(--sidebar-bg)]">
               <div>
                  <h3 className="text-xl font-serif text-[var(--foreground)]">
                     Edit Record: {currentCustomer.customer_id}
                  </h3>
                  <p className="text-sm opacity-60 mt-1">{currentCustomer.customer_name}</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--card-border)] rounded-full transition-colors">
                  <X className="h-6 w-6 opacity-50" />
               </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="edit-form" onSubmit={handleSubmit} className="space-y-8">
                 {/* Quick edit fields - a subset of the full form */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label>
                       <input name="customer_name" defaultValue={currentCustomer.customer_name} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Passport No</label>
                       <input name="passport_no" defaultValue={currentCustomer.passport_no} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Phone / Contact</label>
                       <input name="phone_contact" defaultValue={currentCustomer.phone_contact} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                 </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2 col-span-2">
                       <label className="text-xs font-bold uppercase opacity-70">Mode of Visa</label>
                       <input name="mode_of_visa" list="editModeList" defaultValue={currentCustomer.mode_of_visa} className="input-anthropic w-full px-3 py-2 text-sm" />
                       <datalist id="editModeList">
                          {VISA_MODES.map(t => <option key={t} value={t} />)}
                       </datalist>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Visa Duration</label>
                       <input name="visa_duration" list="editDurationList" defaultValue={currentCustomer.visa_duration} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                       <datalist id="editDurationList">
                          {DURATIONS.map(t => <option key={t} value={t} />)}
                       </datalist>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Visa Supplier</label>
                       <input name="visa_supplier" list="editSupplierList" defaultValue={currentCustomer.visa_supplier} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                       <datalist id="editSupplierList">
                          {VISA_SUPPLIERS.map(t => <option key={t} value={t} />)}
                       </datalist>
                    </div>
                 </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Total Amount</label>
                       <input type="number" name="amount" defaultValue={currentCustomer.amount} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Receiving Amount</label>
                       <input type="number" name="receiving_amount" defaultValue={currentCustomer.receiving_amount} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Visa Fees to Supplier</label>
                       <input type="number" name="visa_fees_to_supplier" defaultValue={currentCustomer.visa_fees_to_supplier} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Balance</label>
                       <input name="balance" defaultValue={currentCustomer.balance} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                       <select name="status" defaultValue={currentCustomer.status} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          <option value="Open">Open</option>
                          <option value="Case Closed">Case Closed</option>
                          <option value="File Closed">File Closed</option>
                          <option value="Employment Visa Changed">Employment Visa Changed</option>
                          <option value="Refunded">Refunded</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Cancelled">Cancelled</option>
                       </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Remark / Comments</label>
                       <input name="remark" defaultValue={currentCustomer.remark} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                 </div>
                 
                 {/* Hidden fields to preserve other data when updating */}
                 <input type="hidden" name="monthly_count" value={currentCustomer.monthly_count || ''} />
                 <input type="hidden" name="visa_issued_date" value={currentCustomer.visa_issued_date || ''} />
                 <input type="hidden" name="travel_date" value={currentCustomer.travel_date || ''} />
                 <input type="hidden" name="visa_expiry_date" value={currentCustomer.visa_expiry_date || ''} />
                 <input type="hidden" name="email_address" value={currentCustomer.email_address || ''} />
                 <input type="hidden" name="discount_agent_fees" value={currentCustomer.discount_agent_fees || 0} />
                 <input type="hidden" name="refund" value={currentCustomer.refund || ''} />
                 <input type="hidden" name="payment_method" value={currentCustomer.payment_method || ''} />
                 <input type="hidden" name="comments" value={currentCustomer.comments || ''} />
                 <input type="hidden" name="referred_by" value={currentCustomer.referred_by || ''} />
              </form>
            </div>

            <div className="p-6 border-t border-[var(--card-border)] flex justify-end gap-3 flex-shrink-0 bg-[var(--sidebar-bg)] rounded-b-2xl">
               <button 
                 type="button" 
                 onClick={() => setIsModalOpen(false)}
                 className="px-5 py-2.5 rounded-lg text-sm font-semibold opacity-70 hover:bg-[var(--card-border)] transition-colors"
               >
                 Cancel
               </button>
               <button 
                 form="edit-form"
                 type="submit" 
                 disabled={isSaving}
                 className="flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-6 py-2.5 text-sm font-semibold text-[#F5F4EF] hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
               >
                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
               </button>
            </div>
          </div>
        </div>
      )}

      {isQuickAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsQuickAddOpen(false)}>
          <div className="modal-container max-w-lg scale-in-center" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--sidebar-bg)]">
               <h3 className="text-xl font-serif text-[var(--foreground)]">Quick Add Visa Customer</h3>
               <button onClick={() => setIsQuickAddOpen(false)} className="p-1 hover:bg-[var(--card-border)] rounded-full transition-colors">
                  <X className="h-5 w-5 opacity-50" />
               </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <form id="quick-add-form" onSubmit={async (e) => {
                e.preventDefault()
                setIsQuickAdding(true)
                const formData = new FormData(e.currentTarget)
                const now = new Date()
                const monthYear = now.toLocaleString('default', { month: 'short' }) + '/' + now.getFullYear()
                formData.append('monthly_count', monthYear)
                
                const { addVisaCustomer } = await import('@/app/actions/visa-customers')
                const res = await addVisaCustomer(formData)
                if (res.error) {
                  alert(res.error)
                } else {
                  // Reload page to get new customer
                  window.location.reload()
                }
                setIsQuickAdding(false)
              }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
                    <input name="customer_name" required placeholder="e.g. AUNG MYO THU" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Passport No</label>
                    <input name="passport_no" placeholder="e.g. MF393023" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Visa Mode</label>
                      <select name="mode_of_visa" defaultValue="60 Visit Visa" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm">
                        {VISA_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
                      <select name="visa_supplier" defaultValue="DAHR" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm">
                        {VISA_SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Charge (AED)</label>
                      <input type="number" name="amount" defaultValue="0" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                      <select name="status" defaultValue="Open" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all shadow-sm">
                         <option value="Open">Open</option>
                         <option value="Case Closed">Case Closed</option>
                         <option value="File Closed">File Closed</option>
                      </select>
                    </div>
                  </div>
              </form>
            </div>

            <div className="p-5 border-t border-[var(--card-border)] flex justify-end gap-3 bg-[var(--sidebar-bg)]">
               <button 
                 type="button" 
                 onClick={() => setIsQuickAddOpen(false)}
                 className="px-4 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:bg-[var(--card-border)] transition-colors"
               >
                 Cancel
               </button>
               <button 
                 form="quick-add-form"
                 type="submit" 
                 disabled={isQuickAdding}
                 className="flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-medium text-[#F5F4EF] hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
               >
                 {isQuickAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Customer'}
               </button>
            </div>
          </div>
        </div>
      )}

      {docCustomer && (
        <DocumentModal
          isOpen={!!docCustomer}
          onClose={() => setDocCustomer(null)}
          customerId={docCustomer.id}
          customerName={docCustomer.customer_name}
        />
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.3);
          border-radius: 20px;
        }
      `}</style>
    </div>
  )
}
