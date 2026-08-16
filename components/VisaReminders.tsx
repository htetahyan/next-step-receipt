'use client'

import React from 'react'
import { AlertCircle, Clock, PlaneTakeoff, Bus, ArrowRight, Calendar } from 'lucide-react'
import Link from 'next/link'

export interface DepartureReminder {
  id: string;
  referenceId: string;
  customerName: string;
  category: string;
  travelDate: string;
  daysLeft: number;
  isHot: boolean;
  mode: string;
}

export default function VisaReminders({ reminders = [] }: { reminders?: DepartureReminder[] }) {
  if (!reminders || reminders.length === 0) return null

  return (
    <div className="card-anthropic overflow-hidden border border-amber-500/20">
      <div className="border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between bg-amber-500/5">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#D97757]" />
          <h3 className="text-sm font-serif font-medium">
            Upcoming Departures & A2A / Bus Visas (Next 7 Days)
          </h3>
        </div>
        <span className="text-[10px] font-mono font-semibold uppercase bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-full">
          {reminders.length} Scheduled
        </span>
      </div>

      <div className="divide-y divide-[var(--card-border)] max-h-[320px] overflow-y-auto">
        {reminders.map((item) => {
          const isBus = item.mode.includes('bus') || item.mode.includes('b2b')
          return (
            <div
              key={item.id}
              className={`p-4 flex items-center justify-between transition-colors hover:bg-[var(--sidebar-bg)] ${
                item.isHot ? 'bg-amber-500/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-full border border-[var(--card-border)] ${
                    item.isHot ? 'text-[#D97757] bg-[#D97757]/10' : 'opacity-60'
                  }`}
                >
                  {isBus ? <Bus className="w-4 h-4" /> : <PlaneTakeoff className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-medium">{item.customerName}</span>
                    {item.isHot && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-red-500 text-white">
                        HOT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-60 font-mono">
                    <span className="text-[#D97757] font-semibold">{item.referenceId || '—'}</span>
                    <span>•</span>
                    <span>{item.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.travelDate} ({item.daysLeft === 0 ? 'Today' : item.daysLeft === 1 ? 'Tomorrow' : `in ${item.daysLeft}d`})
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/dashboard/uae-visa?search=${encodeURIComponent(item.customerName)}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--sidebar-bg)] border border-[var(--card-border)] hover:border-[#D97757] transition-all"
              >
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
