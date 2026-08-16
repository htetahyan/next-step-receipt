'use client'

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Shield, Plane, Globe, Ticket, Database, Briefcase, Plus, Menu, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { UserProfile, checkPermission, ModuleKey } from "@/lib/auth-permissions";

interface SidebarProps {
  profile?: UserProfile | null;
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        setIsMobileMenuOpen(false);
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
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const allNavItems: { name: string; href: string; icon: any; moduleKey?: ModuleKey }[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Directory & Services", href: "/dashboard/customers", icon: Users, moduleKey: "customers" },
    { name: "UAE Visa Tracker", href: "/dashboard/uae-visa", icon: Shield, moduleKey: "uae_visa" },
    { name: "Air Tickets", href: "/dashboard/air-tickets", icon: Plane, moduleKey: "air_tickets" },
    { name: "Other Visa", href: "/dashboard/other-visa", icon: Globe, moduleKey: "other_visa" },
    { name: "Tour Packages", href: "/dashboard/tour-packages", icon: Briefcase, moduleKey: "tour_packages" },
    { name: "Invoices", href: "/dashboard/invoices", icon: FileText, moduleKey: "invoices" },
    { name: "Suppliers", href: "/dashboard/suppliers", icon: Briefcase, moduleKey: "suppliers" },
    { name: "Data Migration", href: "/dashboard/migrate", icon: Database, moduleKey: "migration" },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, moduleKey: "settings" },
  ];

  const navItems = allNavItems.filter(item => {
    if (!item.moduleKey) return true;
    return checkPermission(profile || null, item.moduleKey, 'read');
  });

  const canCreateUAE = checkPermission(profile || null, 'uae_visa', 'create');
  const canCreateAir = checkPermission(profile || null, 'air_tickets', 'create');
  const canCreateOther = checkPermission(profile || null, 'other_visa', 'create');
  const canCreateTour = checkPermission(profile || null, 'tour_packages', 'create');
  const canCreateCustomer = checkPermission(profile || null, 'customers', 'create');
  const canCreateInvoice = checkPermission(profile || null, 'invoices', 'create');

  const hasAnyCreate = canCreateUAE || canCreateAir || canCreateOther || canCreateTour || canCreateCustomer || canCreateInvoice;

  const sidebarContent = (
    <div className="flex h-full w-full flex-col bg-[var(--sidebar-bg)]">
      <div className="flex h-16 items-center border-b border-[var(--card-border)] px-6 justify-between bg-[var(--sidebar-bg)]">
        <h1 className="font-serif font-black text-xl tracking-tight text-[#D97757]">NextStep.</h1>
        {profile && (
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
            profile.role === 'admin' ? 'bg-[#D97757]/15 text-[#D97757]' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
          }`}>
            {profile.role}
          </span>
        )}
      </div>

      {hasAnyCreate && (
        <div className="px-3 pt-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D97757] text-[#F5F4EF] px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </button>
          
          {isQuickAddOpen && (
            <div className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 rounded-lg border border-[var(--card-border)] bg-[var(--sidebar-bg)] p-1 shadow-lg">
              {canCreateUAE && (
                <Link
                  href="/dashboard/uae-visa/new"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
                >
                  <Shield className="h-4 w-4 opacity-70" />
                  New UAE Visa
                </Link>
              )}
              {canCreateAir && (
                <Link
                  href="/dashboard/air-tickets/new"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
                >
                  <Plane className="h-4 w-4 opacity-70" />
                  New Air Ticket
                </Link>
              )}
              {canCreateOther && (
                <Link
                  href="/dashboard/other-visa/new"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
                >
                  <Globe className="h-4 w-4 opacity-70" />
                  New Other Visa
                </Link>
              )}
              {canCreateTour && (
                <Link
                  href="/dashboard/tour-packages/new"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
                >
                  <Briefcase className="h-4 w-4 opacity-70" />
                  New Tour Package
                </Link>
              )}
              {canCreateCustomer && (
                <Link
                  href="/dashboard/customers?new=true"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
                >
                  <Users className="h-4 w-4 opacity-70" />
                  New Customer
                </Link>
              )}
              {canCreateInvoice && (
                <Link
                  href="/dashboard/invoices/new"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]"
                >
                  <FileText className="h-4 w-4 opacity-70" />
                  New Invoice
                </Link>
              )}
            </div>
          )}
        </div>
      )}

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

      <div className="p-3 border-t border-[var(--card-border)] space-y-2">
        {profile && (
          <div className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-xs flex flex-col">
            <span className="font-semibold truncate">{profile.fullName || profile.email.split('@')[0]}</span>
            <span className="opacity-60 text-[10px] truncate">{profile.email}</span>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--card-border)] cursor-pointer"
        >
          <LogOut className="h-4 w-4 opacity-60" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile & Tablet Top Navigation Header (hidden on PC/laptop lg screens) */}
      <div className="lg:hidden flex h-14 w-full items-center justify-between border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] px-4 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-serif font-black text-lg text-[#D97757]">NextStep.</h1>
          {profile && (
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#D97757]/15 text-[#D97757]">
              {profile.role}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-[var(--foreground)] rounded-lg hover:bg-[var(--card-border)] cursor-pointer"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6 text-[#D97757]" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Slide-Out Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 max-w-[80vw] flex-1 flex-col bg-[var(--sidebar-bg)] shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop & Laptop Persistent Sidebar (Always visible on lg screens >=1024px) */}
      <div className="hidden lg:flex h-screen w-64 flex-col border-r border-[var(--card-border)] bg-[var(--sidebar-bg)] shadow-sm shrink-0">
        {sidebarContent}
      </div>
    </>
  );
}
