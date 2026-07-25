'use client'

import React, { useState, useRef, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, User, Mail, Phone, Calendar, MoreHorizontal, Edit2, Trash2, Loader2, X, FileText, ArrowRight, Scan, UploadCloud, CheckCircle2, Search } from 'lucide-react'
import { updateCustomer, deleteCustomer, addCustomer } from '@/app/actions/customers'
import { addDocument } from '@/app/actions/documents'
import { getPresignedUrl } from '@/app/actions/r2'
import DocumentModal from './DocumentModal'
import Link from 'next/link'
import Pagination from './Pagination'

export default function CustomerList({ initialCustomers }: { initialCustomers: any[] }) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [docCustomer, setDocCustomer] = useState<any>(null)
  
  const [isScanning, setIsScanning] = useState(false)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScanPassport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setPassportFile(file); // Save file for uploading later

    try {
      const formData = new FormData();
      formData.append('passport', file);

      const res = await fetch('/api/parse-passport', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Populate form fields
      const form = document.getElementById('customer-form') as HTMLFormElement;
      if (form) {
        if (data.name) (form.elements.namedItem('name') as HTMLInputElement).value = data.name;
        if (data.passport_no) (form.elements.namedItem('passport_no') as HTMLInputElement).value = data.passport_no;
        if (data.dob) (form.elements.namedItem('dob') as HTMLInputElement).value = data.dob;
        if (data.nationality) (form.elements.namedItem('nationality') as HTMLInputElement).value = data.nationality;
        if (data.expiry_date) (form.elements.namedItem('expiry_date') as HTMLInputElement).value = data.expiry_date;
      }
    } catch (err: any) {
      toast.error(`Failed to scan passport: ${err.message}`);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handleEdit = (customer: any) => {
    setCurrentCustomer(customer)
    setPassportFile(null)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setCurrentCustomer(null)
    setPassportFile(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    setIsDeleting(id)
    const res = await deleteCustomer(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setCustomers(customers.filter(c => c.id !== id))
    }
    setIsDeleting(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    // Bundle extra fields into metadata
    const metadata = {
      dob: formData.get('dob'),
      nationality: formData.get('nationality'),
      expiry_date: formData.get('expiry_date'),
      ...(currentCustomer?.metadata || {}) // merge existing if editing
    }
    formData.set('metadata', JSON.stringify(metadata))

    let customerId = currentCustomer?.id;

    if (currentCustomer) {
      const res = await updateCustomer(customerId, formData)
      if (res.error) {
        toast.error(res.error)
        setIsSaving(false)
        return
      }
      const updated = customers.map(c => 
        c.id === customerId 
        ? { ...c, name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone'), passportNo: formData.get('passport_no'), metadata } 
        : c
      )
      setCustomers(updated)
    } else {
      const res = await addCustomer(formData)
      if (res.error || !res.data) {
        toast.error(res.error || "Failed to add customer")
        setIsSaving(false)
        return
      }
      customerId = res.data.id;
      setCustomers([res.data, ...customers])
    }

    // Upload Passport Image via Cloudflare R2
    if (passportFile && customerId) {
      try {
        const presignedRes = await getPresignedUrl(passportFile.name, passportFile.type);
        if (presignedRes.success && presignedRes.uploadUrl) {
          const uploadRes = await fetch(presignedRes.uploadUrl, {
            method: 'PUT',
            body: passportFile,
            headers: { 'Content-Type': passportFile.type },
          });

          if (uploadRes.ok) {
            await addDocument({
              customerId: customerId,
              title: 'Passport Copy',
              file_url: presignedRes.publicUrl!,
              file_key: presignedRes.fileKey!,
              tag: 'Passport'
            });
          } else {
            console.error("Failed to upload to R2", uploadRes.statusText);
          }
        }
      } catch (uploadErr) {
        console.error("Failed to upload passport image", uploadErr);
      }
    }

    setIsSaving(false)
    setIsModalOpen(false)
  }

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const filtered = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter(c => 
      [c.name, c.email, c.phone, c.passportNo].some(v => v && String(v).toLowerCase().includes(q))
    )
  }, [customers, search])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, currentPage])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-8">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight">Client Directory</h1>
          <p className="text-sm opacity-60 mt-2 font-mono">Total records: {filtered.length}</p>
        </div>
        <button 
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-md bg-[#D97757] px-4 py-2 text-sm font-medium text-[#F5F4EF] transition-all hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-3 shadow-xs">
        <Search className="h-5 w-5 opacity-40" />
        <input 
          type="text"
          placeholder="Search by client name, email, phone, or passport number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-0 outline-none w-full text-sm font-medium focus:ring-0 placeholder:opacity-50 text-[var(--foreground)]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="opacity-40 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="card-anthropic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs uppercase opacity-70">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Client Information</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Contact Details</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Joined</th>
                <th scope="col" className="px-6 py-4 text-right font-medium tracking-wider">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems?.map((customer) => (
                <tr key={customer.id} className="hover:bg-[var(--sidebar-bg)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card-border)]">
                        <User className="h-4 w-4 opacity-70" />
                      </div>
                      <div className="font-serif text-lg">{customer.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5 opacity-80">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Mail className="h-3.5 w-3.5 opacity-50" />
                        <span className="truncate max-w-[180px]">{customer.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <Phone className="h-3.5 w-3.5 opacity-50" />
                        <span>{customer.phone || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-70 text-xs font-mono">
                      <Calendar className="h-3.5 w-3.5 opacity-50" />
                      <span>{new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setDocCustomer(customer)}
                        className="p-2 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100"
                        title="Documents"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <Link 
                        href={`/dashboard/customers/${customer.id}`}
                        className="p-2 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100"
                        title="Open Customer Hub"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                       <button 
                        onClick={() => handleEdit(customer)}
                        className="p-2 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        disabled={isDeleting === customer.id}
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className="p-2 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:text-red-500"
                      >
                        {isDeleting === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!paginatedItems || paginatedItems.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center">
                     <div className="inline-flex flex-col items-center gap-4">
                        <div className="p-4 bg-[var(--card-border)] rounded-full">
                           <User className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="opacity-60 font-serif">No customers found matching your search.</p>
                        <button onClick={handleAdd} className="text-[#D97757] font-medium hover:underline">Register your first client</button>
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
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container max-w-lg scale-in-center overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
                   <div className="space-y-1">
                      <h3 className="text-xl font-serif">
                         {currentCustomer ? 'Update Profile' : 'New Client Profile'}
                      </h3>
                   </div>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--card-border)] rounded-full transition-colors">
                      <X className="h-5 w-5 opacity-50" />
                   </button>
                </div>

                {!currentCustomer && (
                  <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        {passportFile && !isScanning ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Scan className="w-4 h-4 opacity-70" />} 
                        {passportFile && !isScanning ? 'Passport Scanned & Attached' : 'AI Auto-fill'}
                      </h4>
                      <p className="text-xs opacity-60 mt-1">
                        {passportFile ? passportFile.name : 'Upload a passport image to extract details.'}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleScanPassport} 
                    />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isScanning}
                      className="px-3 py-1.5 bg-[var(--background)] border border-[var(--card-border)] text-xs font-medium rounded hover:opacity-80 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      {isScanning ? 'Scanning...' : (passportFile ? 'Rescan' : 'Upload')}
                    </button>
                  </div>
                )}

                <form id="customer-form" onSubmit={handleSubmit} className="space-y-6">
                   
                   <div className="space-y-4">
                      <h4 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-2 border-b border-[var(--card-border)]">Basic Contact</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                           <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Full Name</label>
                           <input 
                             name="name" 
                             defaultValue={currentCustomer?.name} 
                             required 
                             autoFocus
                             className="input-anthropic w-full px-4 py-3 text-sm"
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Email</label>
                             <input 
                               type="email" 
                               name="email" 
                               defaultValue={currentCustomer?.email} 
                               className="input-anthropic w-full px-4 py-3 text-sm"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Phone</label>
                             <input 
                               name="phone" 
                               defaultValue={currentCustomer?.phone} 
                               className="input-anthropic w-full px-4 py-3 text-sm"
                             />
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-serif uppercase tracking-wider opacity-50 pb-2 border-b border-[var(--card-border)]">Passport Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Passport No</label>
                           <input 
                             name="passport_no" 
                             defaultValue={currentCustomer?.passportNo} 
                             className="input-anthropic w-full px-4 py-3 text-sm uppercase"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Nationality</label>
                           <input 
                             name="nationality" 
                             defaultValue={currentCustomer?.metadata?.nationality} 
                             className="input-anthropic w-full px-4 py-3 text-sm uppercase"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Date of Birth</label>
                           <input 
                             name="dob" 
                             type="date"
                             defaultValue={currentCustomer?.metadata?.dob} 
                             className="input-anthropic w-full px-4 py-3 text-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs uppercase tracking-wider font-medium opacity-70 px-1">Expiry Date</label>
                           <input 
                             name="expiry_date" 
                             type="date"
                             defaultValue={currentCustomer?.metadata?.expiry_date} 
                             className="input-anthropic w-full px-4 py-3 text-sm"
                           />
                        </div>
                      </div>
                   </div>

                   <button 
                     type="submit" 
                     disabled={isSaving}
                     className="w-full flex items-center justify-center gap-3 rounded-md bg-[#D97757] px-6 py-3.5 text-sm font-medium text-[#F5F4EF] hover:opacity-90 disabled:opacity-50 transition-all"
                   >
                     {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : currentCustomer ? 'Save Changes' : (passportFile ? 'Save Profile & Attach Passport' : 'Confirm Registration')}
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}

      {docCustomer && (
        <DocumentModal
          isOpen={!!docCustomer}
          onClose={() => setDocCustomer(null)}
          customerId={docCustomer.id}
          customerName={docCustomer.name}
        />
      )}
    </div>
  )
}
