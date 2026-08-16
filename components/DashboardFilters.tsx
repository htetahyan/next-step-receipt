'use client'

import React, { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Filter, Loader2, RefreshCw } from 'lucide-react'

export default function DashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentRange = searchParams.get('range') || 'today'
  const currentCategory = searchParams.get('category') || 'all'
  const currentStatus = searchParams.get('status') || 'all'
  const currentFrom = searchParams.get('from') || ''
  const currentTo = searchParams.get('to') || ''

  const quickRanges = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7d' },
    { label: 'This Month', value: 'this-month' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: 'This Year', value: 'this-year' },
    { label: 'All Time', value: 'all' },
  ]

  const categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'UAE Visa', value: 'uae-visa' },
    { label: 'Air Tickets', value: 'air-ticket' },
    { label: 'Tour Packages', value: 'tour-package' },
    { label: 'Other Visas', value: 'other-visa' },
  ]

  const statuses = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open / Active', value: 'Open' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Closed', value: 'Closed' },
  ]

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' && key !== 'range') {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    if (key === 'range' && value !== 'custom') {
      params.delete('from')
      params.delete('to')
    }

    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleCustomDate = (type: 'from' | 'to', val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(type, val)
    params.set('range', 'custom')
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full xl:w-auto">
      {/* Quick Range Segmented Bar */}
      <div className="flex items-center gap-1 p-1 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl overflow-x-auto text-xs">
        {quickRanges.map((r) => {
          const isActive = currentRange === r.value
          return (
            <button
              key={r.value}
              onClick={() => updateParam('range', r.value)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#D97757] text-[#F5F4EF] shadow-sm font-semibold'
                  : 'opacity-70 hover:opacity-100 hover:bg-[var(--card-border)]/50'
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      {/* Dropdown Filters for Category and Status */}
      <div className="flex items-center gap-2">
        {/* Category Dropdown */}
        <select
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
          className="px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#D97757] cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Status Dropdown */}
        <select
          value={currentStatus}
          onChange={(e) => updateParam('status', e.target.value)}
          className="px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#D97757] cursor-pointer"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Custom Date Pickers if selected */}
        {currentRange === 'custom' && (
          <div className="flex items-center gap-1 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl px-2.5 py-1 text-xs">
            <input
              type="date"
              value={currentFrom}
              onChange={(e) => handleCustomDate('from', e.target.value)}
              className="bg-transparent text-[11px] font-mono focus:outline-none"
            />
            <span className="opacity-40">→</span>
            <input
              type="date"
              value={currentTo}
              onChange={(e) => handleCustomDate('to', e.target.value)}
              className="bg-transparent text-[11px] font-mono focus:outline-none"
            />
          </div>
        )}

        {/* Pending Spinner Indicator */}
        {isPending && (
          <div className="flex items-center justify-center p-2 text-[#D97757]">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
