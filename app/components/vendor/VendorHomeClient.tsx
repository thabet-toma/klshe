"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, DollarSign, Package, ShoppingBag, Store } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { useVendorWorkspace } from "./VendorWorkspace";

type LowStockItem = {
  id: string;
  name: string;
  stock: number;
  minStock: number;
};

type Summary = {
  vendor: { id: string; name: string; slug: string } | null;
  productsActive: number;
  ordersToday: number;
  revenueToday: number;
  revenueMonth?: number;
  pendingOrders: number;
  lowStockItems?: LowStockItem[];
  lowStockCount?: number;
};

export default function VendorHomeClient() {
  const { loading: ctxLoading, activeVendorId, withVendorQuery, error } =
    useVendorWorkspace();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeVendorId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      void (async () => {
        try {
          const r = await fetch(
            `/api/vendor/summary?vendorId=${encodeURIComponent(activeVendorId)}`,
            { cache: "no-store" },
          );
          const data = (await r.json()) as Summary & { error?: string };
          if (!cancelled) {
            if (r.ok) setSummary(data);
            else setSummary(null);
          }
        } catch {
          if (!cancelled) setSummary(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [activeVendorId, ctxLoading]);

  const displaySummary = activeVendorId ? summary : null;

  if (ctxLoading || (activeVendorId && loading)) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        جارٍ تحميل بيانات المتجر…
      </div>
    );
  }

  if (error || !activeVendorId) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-neutral-600 ring-1 ring-black/5">
        لا يمكن عرض لوحة المتجر قبل تحميل الصلاحيات. تأكد من تنفيذ migration_003 وربط حسابك
        بجدول vendor_staff.
      </div>
    );
  }

  const lowStockItems = displaySummary?.lowStockItems ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          title="طلبات اليوم"
          value={displaySummary?.ordersToday ?? 0}
          subtitle={`${displaySummary?.pendingOrders ?? 0} قيد المعالجة`}
          icon={ShoppingBag}
          gradient="from-emerald-500 to-teal-500"
        />
        <Kpi
          title="إيرادات اليوم"
          value={formatPrice(displaySummary?.revenueToday ?? 0)}
          subtitle="طلبات «تم التسليم»"
          icon={DollarSign}
          gradient="from-sky-500 to-blue-600"
        />
        <Kpi
          title="إيرادات الشهر"
          value={formatPrice(displaySummary?.revenueMonth ?? 0)}
          subtitle="منصة + فواتير يدوية"
          icon={DollarSign}
          gradient="from-emerald-600 to-green-500"
        />
        <Kpi
          title="منتجات نشطة"
          value={displaySummary?.productsActive ?? 0}
          subtitle={`${displaySummary?.lowStockCount ?? 0} مخزون منخفض`}
          icon={Package}
          gradient="from-violet-500 to-indigo-500"
        />
      </div>

      {lowStockItems.length > 0 && (
        <section className="rounded-3xl bg-rose-50 p-5 ring-1 ring-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-700" strokeWidth={2.4} />
            <h3 className="text-sm font-extrabold text-rose-900">
              تنبيهات مخزون منخفض
            </h3>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {lowStockItems.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2"
              >
                <span className="font-bold text-neutral-900">{it.name}</span>
                <span className="text-rose-700">
                  متوفر {it.stock} من حد {it.minStock}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={withVendorQuery("/vendor/inventory")}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white"
          >
            إدارة المخزون
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
          </Link>
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-emerald-600" strokeWidth={2.4} />
          <h3 className="text-sm font-extrabold text-neutral-900">
            {displaySummary?.vendor?.name ?? "—"}
          </h3>
          {displaySummary?.vendor?.slug && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
              #{displaySummary.vendor.slug}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">إجراءات سريعة</h2>
            <p className="text-[12px] text-neutral-500">
              متابعة الطلبات والمنتجات لهذا المتجر
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={withVendorQuery("/vendor/orders")}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100"
            >
              الطلبات
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
            </Link>
            <Link
              href={withVendorQuery("/vendor/sales-invoices")}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-extrabold text-neutral-800 hover:bg-neutral-200"
            >
              فاتورة بيع جديدة
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
            </Link>
            <Link
              href={withVendorQuery("/vendor/inventory")}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-extrabold text-neutral-800 hover:bg-neutral-200"
            >
              المخزون
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
            </Link>
            <Link
              href={withVendorQuery("/vendor/settings")}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-extrabold text-neutral-800 hover:bg-neutral-200"
            >
              الإعدادات
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  smallValue,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
  smallValue?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-pop`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p className="mt-3 text-[11px] font-bold text-neutral-500">{title}</p>
      <p
        className={`mt-1 font-extrabold text-neutral-900 ${smallValue ? "truncate text-sm leading-snug" : "text-xl"}`}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-[11px] text-neutral-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
