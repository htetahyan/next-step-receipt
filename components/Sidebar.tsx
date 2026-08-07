'use client'

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Shield, Plane, Globe, Ticket, Database, Briefcase, Plus } from "lucide-react";
import { logout } from "@/app/actions/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsQuickAddOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsQuickAddOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsQuickAddOpen(false);
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Directory & Services", href: "/dashboard/customers", icon: Users },
    { name: "UAE Visa Tracker", href: "/dashboard/uae-visa", icon: Shield },
    { name: "Air Tickets", href: "/dashboard/air-tickets", icon: Plane },
    { name: "Other Visa", href: "/dashboard/other-visa", icon: Globe },
    { name: "Tour Packages", href: "/dashboard/tour-packages", icon: Briefcase },
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

      <div className="px-3 pt-4 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D97757] text-[#F5F4EF] px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Quick Add
        </button>
        
        {isQuickAddOpen && (
          <div className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 rounded-lg border border-[var(--card-border)] bg-[var(--sidebar-bg)] p-1 shadow-lg">
            <Link
              href="/dashboard/uae-visa/new"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
            >
              <Shield className="h-4 w-4 opacity-70" />
              New UAE Visa
            </Link>
            <Link
              href="/dashboard/air-tickets/new"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
            >
              <Plane className="h-4 w-4 opacity-70" />
              New Air Ticket
            </Link>
            <Link
              href="/dashboard/other-visa/new"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
            >
              <Globe className="h-4 w-4 opacity-70" />
              New Other Visa
            </Link>
            <Link
              href="/dashboard/tour-packages/new"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
            >
              <Briefcase className="h-4 w-4 opacity-70" />
              New Tour Package
            </Link>
            <Link
              href="/dashboard/customers?new=true"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
            >
              <Users className="h-4 w-4 opacity-70" />
              New Customer
            </Link>
            <Link
              href="/dashboard/invoices/new"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
            >
              <FileText className="h-4 w-4 opacity-70" />
              New Invoice
            </Link>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto">
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
