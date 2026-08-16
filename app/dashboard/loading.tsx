import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-[var(--card-border)] rounded-lg"></div>
          <div className="h-4 w-48 bg-[var(--card-border)]/60 rounded"></div>
        </div>
        <div className="h-10 w-96 bg-[var(--card-border)] rounded-xl"></div>
      </div>

      {/* 4-Card Hero KPI Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-anthropic p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-[var(--card-border)] rounded"></div>
              <div className="h-4 w-4 bg-[var(--card-border)] rounded"></div>
            </div>
            <div className="h-8 w-36 bg-[var(--card-border)] rounded-lg"></div>
            <div className="h-3 w-28 bg-[var(--card-border)]/50 rounded pt-2 border-t border-[var(--card-border)]"></div>
          </div>
        ))}
      </div>

      {/* Analytics Grid Skeleton (Chart + Category Mix) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-anthropic p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-[var(--card-border)] rounded"></div>
              <div className="h-3 w-32 bg-[var(--card-border)]/60 rounded"></div>
            </div>
            <div className="h-6 w-24 bg-[var(--card-border)] rounded-full"></div>
          </div>
          <div className="h-[260px] bg-[var(--card-border)]/30 rounded-xl"></div>
        </div>

        <div className="card-anthropic p-6 space-y-4">
          <div className="h-5 w-36 bg-[var(--card-border)] rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-[var(--card-border)] rounded"></div>
                  <div className="h-3 w-12 bg-[var(--card-border)] rounded"></div>
                </div>
                <div className="h-2 w-full bg-[var(--card-border)]/40 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dual Alerts / Action Watchlist Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-anthropic p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-44 bg-[var(--card-border)] rounded"></div>
            <div className="h-4 w-8 bg-[var(--card-border)] rounded-full"></div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--card-border)]/40 rounded-lg"></div>
            ))}
          </div>
        </div>

        <div className="card-anthropic p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-44 bg-[var(--card-border)] rounded"></div>
            <div className="h-4 w-8 bg-[var(--card-border)] rounded-full"></div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--card-border)]/40 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="card-anthropic overflow-hidden p-6 space-y-4">
        <div className="h-5 w-48 bg-[var(--card-border)] rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-[var(--card-border)]/30 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
