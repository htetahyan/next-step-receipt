'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Shield, Plane, Globe, Ticket, Database, Briefcase } from "lucide-react";
import { logout } from "@/app/actions/auth";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Directory & Services", href: "/dashboard/customers", icon: Users },
    { name: "UAE Visa Tracker", href: "/dashboard/uae-visa", icon: Shield },
    { name: "Air Tickets", href: "/dashboard/air-tickets", icon: Plane },
    { name: "Other Visa", href: "/dashboard/other-visa", icon: Globe },
    { name: "Hotel Booking", href: "/dashboard/hotel-booking", icon: Ticket },
    { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
    { name: "Suppliers", href: "/dashboard/suppliers", icon: Briefcase },
    { name: "Data Migration", href: "/dashboard/migrate", icon: Database },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-[var(--card-border)] bg-[var(--sidebar-bg)] shadow-sm">
      <div className="flex h-16 items-center border-b border-[var(--card-border)] px-6 justify-center bg-[var(--sidebar-bg)]">
        <h1 className="font-serif font-black text-xl tracking-tight text-[#D97757]">NextStep.</h1>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#D97757]/10 text-[#D97757]'
                  : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--card-border)]">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--card-border)]"
        >
          <LogOut className="h-4 w-4 opacity-60" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
