'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Plane, Map, Globe, UserPlus, Receipt, Plus } from 'lucide-react';

export function DashboardQuickActions() {
  const actions = [
    {
      label: 'UAE Visa',
      href: '/dashboard/uae-visa/new',
      icon: Shield,
      color: 'hover:border-[#D97757] hover:bg-[#D97757]/5 text-[#D97757]',
    },
    {
      label: 'Air Ticket',
      href: '/dashboard/air-tickets/new',
      icon: Plane,
      color: 'hover:border-blue-500 hover:bg-blue-500/5 text-blue-500',
    },
    {
      label: 'Tour Package',
      href: '/dashboard/tour-packages/new',
      icon: Map,
      color: 'hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-500',
    },
    {
      label: 'Other Visa',
      href: '/dashboard/other-visa/new',
      icon: Globe,
      color: 'hover:border-purple-500 hover:bg-purple-500/5 text-purple-500',
    },
    {
      label: 'Customer',
      href: '/dashboard/customers',
      icon: UserPlus,
      color: 'hover:border-amber-500 hover:bg-amber-500/5 text-amber-500',
    },
    {
      label: 'Invoice',
      href: '/dashboard/invoices/new',
      icon: Receipt,
      color: 'hover:border-teal-500 hover:bg-teal-500/5 text-teal-500',
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
      <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 mr-1 flex items-center gap-1 shrink-0">
        <Plus className="w-3 h-3" /> Quick Add:
      </span>
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Link
            key={act.label}
            href={act.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-xs font-medium transition-all shrink-0 ${act.color}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{act.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
