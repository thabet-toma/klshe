"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, MapPin, Phone, Truck, UserCheck } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { statusLabel } from "@/lib/order-status";
import type { Driver } from "@/lib/types";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Filter = "all" | string;
type VendorOption = { id: string; name: string; slug: string };
type OrderRow = {
  id: string;
  short_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  cancellation_reason: string | null;
  driver_id: string | null;
  broadcast_at: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  vendors?: { id: string; name: string; slug: string } | null;
  order_items: { id: number; product_name: string; quantity: number; line_total: number }[];
};


const statusActions = [
  { status: "preparing", label: "قيد التحضير" },
  { status: "ready", label: "جاهز للتوصيل" },
  { status: "on_way", label: "في الطريق" },
  { status: "delivered", label: "تم التوصيل" },
];

export default function OrdersBoard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [focused, setFocused] = useState<OrderRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (vendorFilter !== "all") qs.set("vendorId", vendorFilter);
      const res = await fetch(`/api/admin/orders?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { error?: string; orders?: OrderRow[]; vendors?: VendorOption[] };
      if (!res.ok) {
        setError(json.error ?? "تعذر تحميل الطلبات.");
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(json.orders) ? json.orders : []);
      setVendors(Array.isArray(json.vendors) ? json.vendors : []);
    } catch {
      setError("تعذر الاتصال بالخادم.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [vendorFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchOrders();
    });
  }, [fetchOrders]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch("/api/drivers", { cache: "no-store" });
        const data = (await r.json()) as { drivers?: Driver[] };
        if (active && Array.isArray(data.drivers)) setDrivers(data.drivers);
      } catch {
        if (active) setDrivers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`admin-orders-${vendorFilter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void fetchOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => void fetchOrders())
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [vendorFilter, fetchOrders]);

  const filteredOrders = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );
  const statuses = useMemo(() => ["all", ...new Set(orders.map((o) => o.status))], [orders]);

  async function patchOrder(payload: { orderId: string; status?: string; driverId?: string | null }) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "تعذر حفظ التعديل.");
        return;
      }
      await fetchOrders();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold"
        >
          <option value="all">كل المتاجر</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void fetchOrders()}
          className="rounded-xl bg-neutral-100 px-3 py-2 text-sm font-bold hover:bg-neutral-200"
        >
          تحديث
        </button>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <div className="flex w-max min-w-full gap-2 pb-2">
          {statuses.map((s) => {
            const count = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
            const active = filter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                  active ? "bg-brand-gradient text-white shadow-pop" : "bg-white ring-1 ring-black/5"
                }`}
              >
                {s === "all" ? "الكل" : statusLabel(s)}
                <span className={`rounded-full px-1 text-[10px] ${active ? "bg-white/30" : "bg-neutral-100"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">جار تحميل الطلبات...</div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-100">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">لا توجد طلبات ضمن هذا الفلتر</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => setFocused(o)} className="flex w-full flex-col gap-3 rounded-2xl bg-white p-4 text-start shadow-soft ring-1 ring-black/5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-extrabold">{o.short_code}</span>
                  <span className="text-xs font-bold text-neutral-600">{statusLabel(o.status)}</span>
                </div>
                <p className="text-sm font-extrabold">{o.customer_name}</p>
                <p className="line-clamp-1 text-xs text-neutral-600">{o.customer_address}</p>
                <p className="text-xs text-neutral-500">{o.vendors?.name ?? "متجر غير محدد"} - {new Date(o.created_at).toLocaleString("ar-IL")}</p>
                <p className="text-sm font-extrabold text-brand-600">{formatPrice(o.total)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {focused && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold">تفاصيل الطلب {focused.short_code}</h2>
              <button type="button" onClick={() => setFocused(null)} className="text-sm font-bold text-neutral-500">إغلاق</button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {focused.customer_phone}</p>
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" /> {focused.customer_address}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {new Date(focused.created_at).toLocaleString("ar-IL")}</p>
              {focused.notes ? <p className="rounded-xl bg-neutral-50 p-2 text-xs">ملاحظة: {focused.notes}</p> : null}
              {focused.cancellation_reason ? <p className="rounded-xl bg-rose-50 p-2 text-xs text-rose-700">سبب الإلغاء: {focused.cancellation_reason}</p> : null}
            </div>
            <div className="mt-3 space-y-1 border-t border-dashed border-neutral-200 pt-3">
              {focused.order_items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs">
                  <span>{it.product_name} ×{it.quantity}</span>
                  <span className="font-bold">{formatPrice(it.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusActions.map((a) => (
                <button key={a.status} type="button" disabled={saving} onClick={() => void patchOrder({ orderId: focused.id, status: a.status })} className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-extrabold hover:bg-neutral-200 disabled:opacity-50">
                  {a.label}
                </button>
              ))}
            </div>
            {focused.status !== 'broadcast' && (
              <div className="mt-3 rounded-xl bg-neutral-50 p-3">
                <p className="mb-2 text-xs font-bold text-neutral-600">تعيين سائق</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {drivers.map((d) => (
                    <button key={d.id} type="button" disabled={saving} onClick={() => void patchOrder({ orderId: focused.id, driverId: d.id, status: "dispatched" })} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ring-1 ${focused.driver_id === d.id ? "bg-brand-50 ring-brand-200" : "bg-white ring-black/5"}`}>
                      <span>{d.name}</span>
                      {focused.driver_id === d.id ? <UserCheck className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
                {focused.driver_id && (
                  <button type="button" disabled={saving} onClick={() => void patchOrder({ orderId: focused.id, driverId: null })} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-bold ring-1 ring-black/10">
                    <CheckCircle2 className="h-3.5 w-3.5" /> إزالة التعيين
                  </button>
                )}
              </div>
            )}
            
            {focused.status === 'broadcast' && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                <p className="mb-2 text-xs font-bold text-emerald-600">نظام المطالبة</p>
                <p className="text-xs text-neutral-600">هذا الطلب مبث للسائقين وسيتم مطالبته تلقائياً بواسطة أول سائق يقبل الطلب.</p>
                {focused.claimed_by && focused.claimed_at ? (
                  <div className="mt-2 text-xs text-emerald-700">
                    تمت المطالبة بواسطة سائق بتاريخ {new Date(focused.claimed_at).toLocaleString("ar-IL")}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
