"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  Percent,
  Settings,
  Store,
  Truck,
  Users,
  X,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import AdminUserBar from "./AdminUserBar";

const nav = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/admin/vendors", label: "المتاجر", icon: Store },
  { href: "/admin/onboarding", label: "طلبات الانضمام", icon: Inbox },
  { href: "/admin/drivers", label: "السائقون", icon: Truck },
  { href: "/admin/categories", label: "التصنيفات", icon: LayoutGrid },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/commissions", label: "العمولات", icon: Percent },
  { href: "/admin/settings", label: "إعدادات المنصة", icon: Settings },
];

export default function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/onboarding/count", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { pending?: number }) => setPendingCount(d.pending ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-dvh bg-neutral-100">
      {/* Sidebar - Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-s border-black/5 bg-white px-3 py-5 lg:flex">
        <SidebarBrand />
        <NavList pathname={pathname} pendingCount={pendingCount} />
      </aside>

      {/* Sidebar - Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
          <aside className="fixed inset-y-0 end-0 z-50 flex w-72 flex-col bg-white px-3 py-5 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarBrand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              >
                <X className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>
            <NavList pathname={pathname} pendingCount={pendingCount} onClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold sm:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[12px] text-neutral-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="الإشعارات"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          >
            <Bell className="h-5 w-5" strokeWidth={2.4} />
            <span className="absolute end-2 top-2 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <AdminUserBar />
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <Link href="/admin" className="mb-5 flex items-center gap-2 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-pop">
        <LayoutDashboard className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span>
        <span className="block text-base font-extrabold leading-tight">
          {BRAND_NAME}
        </span>
        <span className="block text-[11px] text-neutral-500">
          لوحة الإدارة
        </span>
      </span>
    </Link>
  );
}

function NavList({
  pathname,
  pendingCount,
  onClick,
}: {
  pathname: string;
  pendingCount?: number;
  onClick?: () => void;
}) {
  return (
    <ul className="mt-2 flex-1 space-y-1">
      {nav.map((it) => {
        const Icon = it.icon;
        const active =
          it.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(it.href);
        const isOnboarding = it.href === "/admin/onboarding";
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onClick}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              {it.label}
              {isOnboarding && pendingCount !== undefined && pendingCount > 0 && (
                <span className="me-1 ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white leading-none">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
              {!isOnboarding && active && (
                <span className="ms-auto h-2 w-2 rounded-full bg-brand-500" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
