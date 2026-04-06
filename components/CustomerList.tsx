'use client'

import React, { useState } from 'react'
import { Plus, User, Mail, Phone, Calendar, MoreHorizontal, Edit2, Trash2, Loader2, X } from 'lucide-react'
import { updateCustomer, deleteCustomer, addCustomer } from '@/app/actions/customers'

export default function CustomerList({ initialCustomers }: { initialCustomers: any[] }) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = (customer: any) => {
    setCurrentCustomer(customer)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setCurrentCustomer(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    setIsDeleting(id)
    const res = await deleteCustomer(id)
    if (res.error) {
      alert(res.error)
    } else {
      setCustomers(customers.filter(c => c.id !== id))
    }
    setIsDeleting(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    if (currentCustomer) {
      const res = await updateCustomer(currentCustomer.id, formData)
      if (res.error) {
        alert(res.error)
      } else {
        const updated = customers.map(c => 
          c.id === currentCustomer.id 
          ? { ...c, name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone') } 
          : c
        )
        setCustomers(updated)
        setIsModalOpen(false)
      }
    } else {
      const res = await addCustomer(formData)
      if (res.error) {
        alert(res.error)
      } else {
        setCustomers([res.data, ...customers])
        setIsModalOpen(false)
      }
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Customers Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Total client base: {customers.length}</p>
        </div>
        <button 
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[#0f172a] dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
              <tr>
                <th scope="col" className="px-6 py-5 font-bold">Client Information</th>
                <th scope="col" className="px-6 py-5 font-bold">Contact Details</th>
                <th scope="col" className="px-6 py-5 font-bold">Joined</th>
                <th scope="col" className="px-6 py-5 text-right font-bold">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers?.map((customer) => (
                <tr key={customer.id} className="group bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-900/50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                       <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 transition-transform group-hover:scale-110">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-base">{customer.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span className="truncate max-w-[180px]">{customer.email || 'No email provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Phone className="h-4 w-4 text-indigo-400" />
                        <span>{customer.phone || 'No phone provided'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                      <Calendar className="h-4 w-4 text-amber-400" />
                      <span>{new Date(customer.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => handleEdit(customer)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Edit2 className="h-4.5 w-4.5" />
                      </button>
                      <button 
                        disabled={isDeleting === customer.id}
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {isDeleting === customer.id ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Trash2 className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!customers || customers.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                     <div className="inline-flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full">
                           <User className="h-10 w-10 text-slate-300" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No customers in your directory yet.</p>
                        <button onClick={handleAdd} className="text-blue-600 font-bold hover:underline">Register your first client</button>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md scale-in-center overflow-hidden rounded-[2.5rem] bg-white p-1 dark:bg-[#0f172a] shadow-2xl">
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                         {currentCustomer ? 'Update Profile' : 'New Directory Entry'}
                      </h3>
                      <p className="text-sm text-slate-500">{currentCustomer ? 'Modify existing client details' : 'Register a new customer profile'}</p>
                   </div>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800 transition-colors">
                      <X className="h-6 w-6 text-slate-400" />
                   </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">Full Name</label>
                         <input 
                           name="name" 
                           defaultValue={currentCustomer?.name} 
                           required 
                           autoFocus
                           placeholder="Type customer name"
                           className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white dark:ring-slate-800 transition-all font-medium"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">Email Address</label>
                         <input 
                           type="email" 
                           name="email" 
                           defaultValue={currentCustomer?.email} 
                           placeholder="Ex: name@example.com"
                           className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white dark:ring-slate-800 transition-all font-medium"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">Phone Number</label>
                         <input 
                           name="phone" 
                           defaultValue={currentCustomer?.phone} 
                           placeholder="+971 -- --- ----"
                           className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white dark:ring-slate-800 transition-all font-medium"
                         />
                      </div>
                   </div>

                   <button 
                     type="submit" 
                     disabled={isSaving}
                     className="w-full flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-[0.98]"
                   >
                     {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : currentCustomer ? 'Save Changes' : 'Confirm Registration'}
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scale-in-center {
          animation: scale-in-center 0.3s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        @keyframes scale-in-center {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
