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
import { UserProfile, checkPermission } from '@/lib/auth-permissions'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function CustomerList({
  initialCustomers,
  profile,
}: {
  initialCustomers: any[];
  profile?: UserProfile | null;
}) {
  const canCreate = checkPermission(profile || null, 'customers', 'create');
  const canEdit = checkPermission(profile || null, 'customers', 'edit');
  const canDelete = checkPermission(profile || null, 'customers', 'delete');

  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(deleteTarget.id);
    const res = await deleteCustomer(deleteTarget.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      setCustomers(customers.filter(c => c.id !== deleteTarget.id));
      toast.success('Customer deleted');
    }
    setIsDeleting(null);
    setDeleteTarget(null);
  };

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
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--card-border)] pb-3">
        <div>
          <h1 className="text-xl font-serif font-normal tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-[#D97757] opacity-80" />
            Client Directory
          </h1>
          <p className="text-xs opacity-60 mt-0.5 font-mono">Total records: {filtered.length}</p>
        </div>
        <button 
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97757] px-3.5 h-8.5 text-xs font-medium text-[#F5F4EF] transition-all hover:opacity-90 shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Customer
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="card-anthropic p-2.5 sm:p-3 shadow-xs">
        <div className="relative w-full">
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <Search className="w-4 h-4 opacity-40" />
          </div>
          <input 
            type="text"
            placeholder="Search by client name, email, phone, or passport number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 h-8.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
          />
          {search && (
            <div className="absolute right-2.5 inset-y-0 flex items-center">
              <button onClick={() => setSearch('')} className="opacity-40 hover:opacity-80 p-0.5 cursor-pointer flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card-anthropic overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-230px)] relative">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] backdrop-blur-md text-[10px] uppercase tracking-wider opacity-90 shadow-xs">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Client Information</th>
                <th scope="col" className="px-4 py-2 font-semibold">Contact Details</th>
                <th scope="col" className="px-4 py-2 font-semibold">Joined</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {paginatedItems?.map((customer) => (
                <tr key={customer.id} className="hover:bg-[var(--sidebar-bg)] transition-colors group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-[var(--card-border)] text-xs font-semibold">
                        {customer.name?.charAt(0)?.toUpperCase() || <User className="h-3.5 w-3.5 opacity-70" />}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-[#D97757] transition-colors">{customer.name}</div>
                        {customer.passport_no && (
                          <div className="text-[11px] font-mono opacity-60">Pass: {customer.passport_no}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="space-y-0.5 opacity-80">
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <Mail className="h-3 w-3 opacity-50" />
                          <span className="truncate max-w-[180px]">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <Phone className="h-3 w-3 opacity-50" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {!customer.email && !customer.phone && <span className="opacity-40 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5 opacity-70 text-xs font-mono">
                      <Calendar className="h-3 w-3 opacity-50" />
                      <span>{new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => setDocCustomer(customer)}
                        className="p-1 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                        title="Documents"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <Link 
                        href={`/dashboard/customers/${customer.id}`}
                        className="p-1 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                        title="Open Customer Hub"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      {canEdit && (
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="p-1 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          disabled={isDeleting === customer.id}
                          onClick={() => setDeleteTarget({ id: customer.id, name: customer.name })}
                          className="p-1 rounded-md hover:bg-[var(--card-border)] transition-colors opacity-70 hover:text-red-500 cursor-pointer"
                          title="Delete Customer"
                        >
                          {isDeleting === customer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
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

      {/* Delete Customer Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Customer Account"
        itemType="customer account"
        itemName={deleteTarget?.name || ''}
        isDeleting={!!isDeleting}
        description="Are you sure you want to permanently delete this customer? This will also remove all associated visas, services, and invoices."
      />
    </div>
  )
}
