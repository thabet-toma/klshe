"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Building2,
  FileText,
  LayoutDashboard,
  LayoutList,
  Landmark,
  Menu,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  Users,
  X,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

type VendorRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  staffRole: string | null;
};

type VendorWorkspaceValue = {
  loading: boolean;
  error: string | null;
  vendors: VendorRow[];
  activeVendorId: string | null;
  selectVendor: (id: string) => void;
  withVendorQuery: (path: string) => string;
};

const VendorWorkspaceContext = createContext<VendorWorkspaceValue | null>(null);

export function useVendorWorkspace() {
  const ctx = useContext(VendorWorkspaceContext);
  if (!ctx) {
    throw new Error("useVendorWorkspace يجب أن يكون داخل VendorWorkspaceProvider");
  }
  return ctx;
}

export function VendorWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("vendorId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = requested ? `?vendorId=${encodeURIComponent(requested)}` : "";
      const r = await fetch(`/api/vendor/context${q}`, { cache: "no-store" });
      const data = (await r.json()) as {
        vendors?: VendorRow[];
        activeVendorId?: string;
        error?: string;
      };
      if (!r.ok) {
        setError(data.error ?? "تعذر تحميل المتجر.");
        setVendors([]);
        setActiveVendorId(null);
        return;
      }
      setVendors(data.vendors ?? []);
      setActiveVendorId(data.activeVendorId ?? null);
    } catch {
      setError("تعذر الاتصال بالخادم.");
      setVendors([]);
      setActiveVendorId(null);
    } finally {
      setLoading(false);
    }
  }, [requested]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const selectVendor = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("vendorId", id);
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const withVendorQuery = useCallback(
    (path: string) => {
      if (!activeVendorId) return path;
      const join = path.includes("?") ? "&" : "?";
      return `${path}${join}vendorId=${encodeURIComponent(activeVendorId)}`;
    },
    [activeVendorId],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      vendors,
      activeVendorId,
      selectVendor,
      withVendorQuery,
    }),
    [
      loading,
      error,
      vendors,
      activeVendorId,
      selectVendor,
      withVendorQuery,
    ],
  );

  return (
    <VendorWorkspaceContext.Provider value={value}>
      {children}
    </VendorWorkspaceContext.Provider>
  );
}

const nav = [
  { href: "/vendor", label: "لوحة المتجر", icon: LayoutDashboard },
  { href: "/vendor/orders", label: "طلبات العملاء", icon: ShoppingBag },
  { href: "/vendor/menu", label: "فئات القائمة", icon: LayoutList },
  { href: "/vendor/products", label: "المنتجات", icon: Package },
  { href: "/vendor/inventory", label: "المخزون", icon: Boxes },
  { href: "/vendor/sales-invoices", label: "فواتير البيع", icon: Receipt },
  { href: "/vendor/purchase-invoices", label: "فواتير الشراء", icon: FileText },
  { href: "/vendor/suppliers", label: "الموردون", icon: Building2 },
  { href: "/vendor/customers", label: "حسابات الزبائن", icon: Users },
  { href: "/vendor/settings", label: "الإعدادات", icon: Settings },
  { href: "/vendor/payouts", label: "السحوبات", icon: Landmark },
];

export function VendorShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    loading,
    error,
    vendors,
    activeVendorId,
    selectVendor,
    withVendorQuery,
  } = useVendorWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);

  const brandHref = withVendorQuery("/vendor");

  return (
    <div className="flex min-h-dvh bg-gradient-to-b from-emerald-50/80 to-neutral-100">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-s border-emerald-100/80 bg-white px-3 py-5 shadow-soft lg:flex">
        <VendorSidebarBrand href={brandHref} />
        <VendorSwitcher
          loading={loading}
          vendors={vendors}
          activeVendorId={activeVendorId}
          onSelect={selectVendor}
        />
        <VendorNavList
          pathname={pathname}
          withVendorQuery={withVendorQuery}
        />
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
          <aside className="fixed inset-y-0 end-0 z-50 flex w-72 flex-col bg-white px-3 py-5 shadow-2xl lg:hidden">
            <div className="flex items-center justify-between">
              <VendorSidebarBrand href={brandHref} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              >
                <X className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>
            <VendorSwitcher
              loading={loading}
              vendors={vendors}
              activeVendorId={activeVendorId}
              onSelect={(id) => {
                selectVendor(id);
                setMobileOpen(false);
              }}
            />
            <VendorNavList
              pathname={pathname}
              withVendorQuery={withVendorQuery}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-emerald-100/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 lg:hidden"
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
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">
          {error && (
            <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
              {error}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function VendorSidebarBrand({ href }: { href: string }) {
  return (
    <Link href={href} className="mb-4 flex items-center gap-2 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-pop">
        <Store className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span>
        <span className="block text-base font-extrabold leading-tight">
          {BRAND_NAME}
        </span>
        <span className="block text-[11px] text-emerald-700/80">لوحة البائع</span>
      </span>
    </Link>
  );
}

function VendorSwitcher({
  loading,
  vendors,
  activeVendorId,
  onSelect,
}: {
  loading: boolean;
  vendors: VendorRow[];
  activeVendorId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="mb-4 rounded-2xl bg-emerald-50/80 px-3 py-2 text-xs font-bold text-emerald-900">
        جارٍ تحميل المتاجر…
      </div>
    );
  }

  if (vendors.length <= 1) {
    return (
      <div className="mb-4 rounded-2xl bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
        <p className="font-extrabold">{vendors[0]?.name ?? "المتجر"}</p>
        {vendors[0]?.staffRole && (
          <p className="mt-0.5 text-[11px] text-emerald-700/90">
            الدور: {vendors[0].staffRole}
          </p>
        )}
      </div>
    );
  }

  return (
    <label className="mb-4 block text-[11px] font-bold text-emerald-900">
      المتجر النشط
      <select
        className="mt-1 w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-neutral-800 outline-none ring-emerald-500/25 focus:ring-2"
        value={activeVendorId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {vendors.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function VendorNavList({
  pathname,
  withVendorQuery,
  onNavigate,
}: {
  pathname: string;
  withVendorQuery: (path: string) => string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="mt-2 flex-1 space-y-1">
      {nav.map((it) => {
        const Icon = it.icon;
        const href = withVendorQuery(it.href);
        const active =
          it.href === "/vendor"
            ? pathname === "/vendor"
            : pathname.startsWith(it.href);
        return (
          <li key={it.href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "bg-emerald-100 text-emerald-900"
                  : "text-neutral-600 hover:bg-emerald-50/80"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              {it.label}
              {active && (
                <span className="ms-auto h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
