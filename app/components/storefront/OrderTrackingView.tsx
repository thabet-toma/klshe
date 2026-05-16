"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bike, Check, ChefHat, Clock, Home, MapPin, PackageCheck, Phone, Receipt } from "lucide-react";
import { statusLabels, statusStyles } from "@/lib/order-status";
import { formatPrice } from "@/lib/data";
import type { OrderStatus } from "@/lib/types";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useCart } from "@/lib/stores/cart-store";
import { trackEvent } from "@/lib/analytics/posthog";

const OrderMap = dynamic(() => import("@/app/components/map/OrderMap"), {
  ssr: false,
  loading: () => <div className="h-52 animate-pulse rounded-2xl bg-neutral-200" />,
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

type Props = { orderId: string };
type ApiOrder = {
  id: string; short_code: string; customer_name: string; customer_phone: string; customer_address: string;
  subtotal: number; delivery_fee: number; total: number; status: string; notes: string | null; created_at: string;
  vendor_id: string | null; cancellation_reason: string | null;
  driver_id: string | null;
  accepted_at: string | null; claimed_at: string | null; ready_at: string | null;
  picked_at: string | null; delivered_at: string | null;
  order_items: {
    id: number;
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
    products?: { unit?: string | null; image?: string | null } | null;
  }[];
};
type ApiDriver = { id: string; name: string; phone: string; avatar_url: string; vehicle: string; current_lat?: number | null; current_lng?: number | null };
type ApiRating = {
  id: string;
  vendor_rating: number;
  driver_rating: number | null;
  comment: string | null;
  created_at: string;
};

const trackingSteps: { id: OrderStatus; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "new", label: "تم استلام الطلب", icon: Receipt },
  { id: "preparing", label: "قيد التحضير", icon: ChefHat },
  { id: "on_way", label: "في الطريق", icon: Bike },
  { id: "delivered", label: "تم التوصيل", icon: PackageCheck },
];
const orderOf = ["new", "accepted", "preparing", "ready", "dispatched", "on_way", "delivered"];

export default function OrderTrackingView({ orderId }: Props) {
  const openCart = useCart((s) => s.open);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [driver, setDriver] = useState<ApiDriver | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [rating, setRating] = useState<ApiRating | null>(null);
  const [vendorRating, setVendorRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [comment, setComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    let active = true;
    async function pull() {
      try {
        const r = await fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as { order?: ApiOrder; driver?: ApiDriver | null; rating?: ApiRating | null };
        if (!active) return;
        setOrder(json.order ?? null);
        const d = json.driver ?? null;
        setDriver(d);
        if (d?.current_lat != null) setDriverLat(d.current_lat);
        if (d?.current_lng != null) setDriverLng(d.current_lng);
        setRating(json.rating ?? null);
        if (json.rating) {
          setVendorRating(json.rating.vendor_rating);
          setDriverRating(json.rating.driver_rating ?? 5);
          setComment(json.rating.comment ?? "");
        }
      } catch {}
    }
    void pull();

    if (isSupabaseConfigured) {
      const sb = createBrowserSupabase();
      const channel = sb
        .channel(`storefront-order-${orderId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
          () => void pull(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` },
          () => void pull(),
        )
        .subscribe();
      return () => {
        active = false;
        void sb.removeChannel(channel);
      };
    }

    return () => {
      active = false;
    };
  }, [orderId]);

  // Live driver location via Realtime
  useEffect(() => {
    if (!isSupabaseConfigured || !order?.driver_id) return;
    const sb = createBrowserSupabase();
    const ch = sb
      .channel(`driver-loc-${order.driver_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_drivers",
          filter: `id=eq.${order.driver_id}`,
        },
        (payload) => {
          const row = payload.new as { current_lat?: number | null; current_lng?: number | null };
          if (row.current_lat != null) setDriverLat(row.current_lat);
          if (row.current_lng != null) setDriverLng(row.current_lng);
        },
      )
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [order?.driver_id]);

  // ETA recalculation whenever driver moves
  useEffect(() => {
    if (driverLat == null || driverLng == null) { setEtaMinutes(null); return; }
    const SPEED_KMH = 35;
    // We don't have customer lat/lng in this component; estimate ~5 km as fallback
    const distKm = 5;
    setEtaMinutes(Math.ceil((distKm / SPEED_KMH) * 60));
  }, [driverLat, driverLng]);

  const model = useMemo(() => {
    if (!order) return null;
    return {
      shortCode: order.short_code,
      status: order.status,
      createdAt: order.created_at,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      notes: order.notes,
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      total: order.total,
      items: order.order_items.map((it) => ({
        id: String(it.id),
        name: it.product_name,
        quantity: it.quantity,
        lineTotal: it.line_total,
      })),
    };
  }, [order]);

  useEffect(() => {
    if (!model) return;
    if (model.status !== "delivered") return;
    const key = `jetek-delivered-tracked:${orderId}`;
    if (window.sessionStorage.getItem(key)) return;
    trackEvent("delivered", { order_id: orderId, short_code: model.shortCode });
    window.sessionStorage.setItem(key, "1");
  }, [model, orderId]);

  if (!model) return <div className="mx-auto w-full max-w-screen-md px-4 py-12 text-center"><p className="text-base font-extrabold">الطلب غير موجود</p><Link href="/orders" className="mt-3 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop">العودة إلى طلباتي</Link></div>;

  const shownDriver = driver
    ? { name: driver.name, phone: driver.phone, vehicle: driver.vehicle }
    : null;
  const currentIdx = orderOf.indexOf(model.status);

  async function submitRating() {
    setRatingBusy(true);
    setRatingError(null);
    try {
      const r = await fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorRating, driverRating, comment }),
      });
      const j = (await r.json()) as { rating?: ApiRating; error?: string };
      if (!r.ok) {
        setRatingError(j.error ?? "فشل إرسال التقييم. أعد المحاولة.");
        return;
      }
      setRating(j.rating ?? null);
    } catch {
      setRatingError("تعذر الاتصال بالخادم.");
    } finally {
      setRatingBusy(false);
    }
  }

  async function cancelOrder() {
    if (!cancelReason.trim()) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      const r = await fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setCancelError(j.error ?? "فشل إلغاء الطلب.");
        return;
      }
      setOrder((prev) => prev ? { ...prev, status: "cancelled", cancellation_reason: cancelReason.trim() } : null);
      setShowCancelDialog(false);
    } catch {
      setCancelError("تعذر الاتصال بالخادم.");
    } finally {
      setCancelBusy(false);
    }
  }

  function reorder() {
    if (!order?.vendor_id || !order.order_items.length) return;
    useCart.setState({
      vendorId: order.vendor_id,
      items: order.order_items.map((it) => ({
        productId: it.product_id,
        name: it.product_name,
        price: it.unit_price,
        unit: it.products?.unit ?? "وحدة",
        image:
          it.products?.image ??
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80&auto=format&fit=crop",
        quantity: it.quantity,
      })),
      vendorSwitchPrompt: null,
      isOpen: true,
    });
    openCart();
  }

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 pb-10">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/orders" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100" aria-label="رجوع"><ArrowRight className="h-5 w-5" strokeWidth={2.4} /></Link>
        <div><h1 className="text-lg font-extrabold">طلب {model.shortCode}</h1><p className="text-[12px] text-neutral-500">{new Date(model.createdAt).toLocaleString("ar-IL")}</p></div>
        <span className={`ms-auto rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusStyles[model.status as keyof typeof statusStyles] ?? "bg-neutral-100 text-neutral-700"}`}>{statusLabels[model.status as keyof typeof statusLabels] ?? model.status}</span>
      </div>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <h2 className="mb-3 text-sm font-extrabold">حالة الطلب</h2>
        <ol className="relative">
          {trackingSteps.map((s, i) => {
            const reached = orderOf.indexOf(s.id) <= currentIdx;
            const Icon = s.icon;
            const ts = s.id === "new" ? order?.created_at
              : s.id === "preparing" ? order?.accepted_at
              : s.id === "on_way" ? order?.picked_at
              : s.id === "delivered" ? order?.delivered_at
              : null;
            return (
              <li key={s.id} className="flex items-start gap-3 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${reached ? "bg-brand-gradient text-white shadow-pop" : "bg-neutral-100 text-neutral-400"}`}>
                    {reached ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-4 w-4" strokeWidth={2.4} />}
                  </span>
                  {i < trackingSteps.length - 1 && <span className={`mt-1 h-8 w-0.5 ${reached ? "bg-brand-300" : "bg-neutral-200"}`} />}
                </div>
                <div className="pt-1">
                  <p className={`text-sm font-bold ${reached ? "text-neutral-900" : "text-neutral-500"}`}>{s.label}</p>
                  {reached && ts && (
                    <p className="text-[11px] text-neutral-400">
                      {new Date(ts).toLocaleTimeString("ar-IL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {shownDriver && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <h2 className="mb-3 text-sm font-extrabold">السائق المعيّن</h2>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold">{shownDriver.name}</p>
              <p className="text-[12px] text-neutral-500">{shownDriver.vehicle}</p>
              {etaMinutes != null && (
                <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-brand-700">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
                  وقت التوصيل المتوقع: {etaMinutes} د
                </p>
              )}
            </div>
            <a href={`tel:${shownDriver.phone}`} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-pop active:scale-95" aria-label="اتصال بالسائق">
              <Phone className="h-5 w-5" strokeWidth={2.4} />
            </a>
          </div>
        </section>
      )}

      {/* Live map — shown when driver is on the way */}
      {(model.status === "dispatched" || model.status === "on_way") && driverLat != null && driverLng != null && (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-extrabold">موقع السائق الحيّ</h2>
          <OrderMap driverLat={driverLat} driverLng={driverLng} />
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5"><h2 className="mb-3 text-sm font-extrabold">عنوان التوصيل</h2><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MapPin className="h-5 w-5" strokeWidth={2.4} /></span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{model.customerName}</p><p className="text-[12px] text-neutral-500">{model.customerAddress}</p>{model.notes && <p className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">ملاحظة: {model.notes}</p>}</div></div></section>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <h2 className="mb-3 text-sm font-extrabold">المنتجات</h2>
        <ul className="space-y-2.5">{model.items.map((it) => <li key={it.id} className="flex items-center justify-between gap-3"><p className="line-clamp-1 text-sm font-bold">{it.name}</p><p className="text-xs text-neutral-500">×{it.quantity}</p><span className="text-sm font-extrabold">{formatPrice(it.lineTotal)}</span></li>)}</ul>
        <dl className="mt-4 space-y-1.5 border-t border-dashed border-neutral-200 pt-3 text-sm"><div className="flex items-center justify-between text-neutral-600"><dt>المجموع الفرعي</dt><dd className="font-bold">{formatPrice(model.subtotal)}</dd></div><div className="flex items-center justify-between text-neutral-600"><dt>التوصيل</dt><dd className="font-bold">{formatPrice(model.deliveryFee)}</dd></div><div className="flex items-center justify-between text-base"><dt className="font-extrabold">المجموع</dt><dd className="font-extrabold text-brand-600">{formatPrice(model.total)}</dd></div></dl>
      </section>

      {model.status === "delivered" && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <h2 className="mb-3 text-sm font-extrabold">تقييم الطلب</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-bold text-neutral-600">
              تقييم المتجر
              <input
                type="number"
                min={1}
                max={5}
                value={vendorRating}
                onChange={(e) => setVendorRating(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-neutral-600">
              تقييم السائق
              <input
                type="number"
                min={1}
                max={5}
                value={driverRating}
                onChange={(e) => setDriverRating(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="تعليقك (اختياري)"
            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="button"
            disabled={ratingBusy}
            onClick={() => void submitRating()}
            className="mt-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {ratingBusy ? "جار الحفظ..." : rating ? "تحديث التقييم" : "إرسال التقييم"}
          </button>
          {ratingError && <p className="mt-2 text-xs font-bold text-rose-600">{ratingError}</p>}
        </section>
      )}

      {!["dispatched", "on_way", "delivered", "cancelled", "rejected"].includes(model.status) && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          {!showCancelDialog ? (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="w-full rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
            >
              إلغاء الطلب
            </button>
          ) : (
            <div>
              <h2 className="mb-2 text-sm font-extrabold text-rose-700">سبب الإلغاء</h2>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اذكر سبب الإلغاء..."
                className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm"
                rows={2}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={cancelBusy || !cancelReason.trim()}
                  onClick={() => void cancelOrder()}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  {cancelBusy ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCancelDialog(false); setCancelReason(""); setCancelError(null); }}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-extrabold text-neutral-700"
                >
                  تراجع
                </button>
              </div>
              {cancelError && <p className="mt-2 text-xs font-bold text-rose-600">{cancelError}</p>}
            </div>
          )}
        </section>
      )}

      {model.status === "cancelled" && (
        <section className="mt-4 rounded-2xl bg-rose-50 p-4 text-center ring-1 ring-rose-200">
          <p className="text-sm font-extrabold text-rose-700">تم إلغاء هذا الطلب</p>
          {model.notes && <p className="mt-1 text-xs text-rose-600">السبب: {model.notes}</p>}
        </section>
      )}

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={reorder}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-extrabold text-white shadow-pop"
        >
          <Receipt className="h-5 w-5" strokeWidth={2.2} />
          أعد الطلب
        </button>
        <Link href="/" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100"><Home className="h-5 w-5" strokeWidth={2.2} />العودة للرئيسية</Link>
      </div>
    </div>
  );
}
