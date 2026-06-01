'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, ChevronDown, Tag, Activity } from 'lucide-react'

export default function DashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentRange = searchParams.get('range') || '7d'
  const currentCategory = searchParams.get('category') || 'all'
  const currentStatus = searchParams.get('status') || 'all'

  const ranges = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'All Time', value: 'all' },
  ]

  const categories = [
    { label: 'All Services', value: 'all' },
    { label: 'UAE Visit Visa', value: 'uae-visa' },
    { label: 'Air Tickets', value: 'air-ticket' },
    { label: 'Other Visa', value: 'other-visa' },
    { label: 'Hotel Booking', value: 'hotel' },
  ]

  const statuses = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open', value: 'Open' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Closed', value: 'Closed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ]

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white dark:bg-slate-900 border border-[var(--card-border)] rounded-2xl p-3 shadow-sm">
      {/* Date Range Filter */}
      <div className="flex items-center gap-3 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 flex-1 sm:flex-none">
        <Calendar className="h-4 w-4 text-[#D97757]" />
        <div className="relative flex-1">
          <select 
            value={currentRange}
            onChange={(e) => handleFilterChange('range', e.target.value)}
            className="appearance-none bg-transparent pr-8 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full"
          >
            {ranges.map(r => (
              <option key={r.value} value={r.value} className="bg-white dark:bg-slate-950">{r.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D97757] pointer-events-none" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-3 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 flex-1 sm:flex-none">
        <Tag className="h-4 w-4 text-[#D97757]" />
        <div className="relative flex-1">
          <select 
            value={currentCategory}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="appearance-none bg-transparent pr-8 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full"
          >
            {categories.map(c => (
              <option key={c.value} value={c.value} className="bg-white dark:bg-slate-950">{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D97757] pointer-events-none" />
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-3 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 flex-1 sm:flex-none">
        <Activity className="h-4 w-4 text-[#D97757]" />
        <div className="relative flex-1">
          <select 
            value={currentStatus}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="appearance-none bg-transparent pr-8 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full"
          >
            {statuses.map(s => (
              <option key={s.value} value={s.value} className="bg-white dark:bg-slate-950">{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D97757] pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
