'use client'

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Plane, Building } from "lucide-react";
import { logout } from "@/app/actions/auth";

export default function Sidebar() {
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
    { name: "Flight Booking", href: "/dashboard/flight-booking", icon: Plane },
    { name: "Hotel Booking", href: "/dashboard/hotel-booking", icon: Building },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-[#e2e8f0] bg-white dark:border-[#1e293b] dark:bg-[#0f172a] shadow-sm">
      <div className="flex h-12 items-center border-b border-[#e2e8f0] px-6 dark:border-[#1e293b] justify-center">
        <Image
          src="/logo.jpg"
          alt="Company Logo"
          width={40}
          height={15}
          className="object-contain"
        />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#e2e8f0] dark:border-[#1e293b]">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>

      <div className="border-t border-[#e2e8f0] p-4 dark:border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-900 font-bold dark:bg-emerald-900/50 dark:text-emerald-400">
            A
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Admin User</p>
          </div>
        </div>
      </div>
    </div>
  );
}
