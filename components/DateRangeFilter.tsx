'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, ChevronDown } from 'lucide-react'

export default function DateRangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = searchParams.get('range') || '7d'

  const ranges = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'All Time', value: 'all' },
  ]

  const handeRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-2xl px-4 py-2 shadow-sm shadow-emerald-500/5">
       <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
           <Calendar className="h-4 w-4" />
       </div>
       <div className="relative">
          <select 
            value={currentRange}
            onChange={(e) => handeRangeChange(e.target.value)}
            className="appearance-none bg-transparent pr-8 text-sm font-black text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer uppercase tracking-tighter"
          >
            {ranges.map(r => (
               <option key={r.value} value={r.value} className="bg-white dark:bg-slate-900">{r.label}</option>
            ))}
          </select>
          <div className="absolute right-0 inset-y-0 flex items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-emerald-500" />
          </div>
       </div>
    </div>
  )
}
