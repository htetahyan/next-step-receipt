'use client'

import React, { useActionState, useEffect, useState } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { updateSettings, getSettings, type SettingsState } from '@/app/actions/settings'

export default function SettingsPage() {
  const [initialData, setInitialData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettings, undefined)

  useEffect(() => {
    async function load() {
      const data = await getSettings()
      if (data) setInitialData(data)
      setIsLoading(false)
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    )
  }

  return (
    <form action={action} className="space-y-6 max-w-4xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your business details and invoice defaults.</p>
        </div>
        {state?.message && (
          <div className="flex items-center gap-2 text-green-600 font-medium animate-in fade-in slide-in-from-right-4">
             <CheckCircle2 className="h-5 w-5" />
             {state.message}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#1e293b] dark:bg-[#0f172a] overflow-hidden">
         <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">Business Details</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">These details will be used on your generated invoices.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">Company Name</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="company_name"
                  defaultValue={initialData?.company_name || "NextStep Travel & Tourism FZC LLC"} 
                  className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-700 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white transition-all" 
                />
              </div>
            </div>

            <div className="sm:col-span-full">
              <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">Address / Location</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="company_address"
                  defaultValue={initialData?.company_address || "Office No 4B, 3rd Floor IBIS Hotel Business Center, Al Rigga, Deira Dubai, United Arab Emirates"} 
                  className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-700 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white transition-all" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

       <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#1e293b] dark:bg-[#0f172a] overflow-hidden">
         <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">Default Payment/Bank configuration</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your bank details for customers to pay via transfer.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">Bank Name</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="bank_name"
                  defaultValue={initialData?.bank_name || "Mashreq Bank"} 
                  className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-700 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white transition-all" 
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">Branch</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="bank_branch"
                  defaultValue={initialData?.bank_branch || "Deira, Dubai"} 
                  className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-700 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white transition-all" 
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">IBAN #</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="bank_iban"
                  defaultValue={initialData?.bank_iban || "AE300330000019101789314"} 
                  className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-700 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white transition-all" 
                />
              </div>
            </div>
            
             <div className="sm:col-span-3">
              <label className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">Account No</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="bank_account_no"
                  defaultValue={initialData?.bank_account_no || "019101789314"} 
                  className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-700 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white transition-all" 
                />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end dark:bg-slate-900/50">
             <button 
               type="submit" 
               disabled={pending}
               className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 disabled:opacity-50"
             >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Settings
             </button>
        </div>
      </div>

      {state?.error && (
        <div className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-lg border border-red-100">
           {state.error}
        </div>
      )}
    </form>
  )
}
