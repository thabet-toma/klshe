"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  Truck,
} from "lucide-react";
import { statusLabels, statusStyles } from "@/lib/mock";
import { formatPrice } from "@/lib/data";

type DriverOrder = {
  id: string;
  short_code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  location_lat: number | null;
  location_lng: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: "cash" | "card";
  notes: string | null;
  order_items: {
    id: number;
    product_name: string;
    quantity: number;
    line_total: number;
  }[];
};

export default function DriverOrderDetails({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pull = useCallback(async () => {
    const r = await fetch(`/api/driver/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const j = (await r.json()) as { order?: DriverOrder; error?: string };
    if (!r.ok) {
      setError(j.error ?? "تعذر تحميل الطلب.");
      return;
    }
    setError(null);
    setOrder(j.order ?? null);
  }, [orderId]);

  useEffect(() => {
    queueMicrotask(() => {
      void pull();
    });
  }, [pull]);

  const nextAction = useMemo(() => {
    if (!order) return null;
    if (order.status === "ready") return { action: "pickup", label: "استلمت الطلب" };
    if (order.status === "dispatched") return { action: "start", label: "بدأت التوصيل" };
    if (order.status === "on_way") return { action: "delivered", label: "أكد التوصيل" };
    return null;
  }, [order]);

  const mapsUrl = useMemo(() => {
    if (order?.location_lat == null || order?.location_lng == null) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${order.location_lat},${order.location_lng}&travelmode=driving`;
  }, [order]);

  const wazeUrl = useMemo(() => {
    if (order?.location_lat == null || order?.location_lng == null) return null;
    return `https://waze.com/ul?ll=${order.location_lat},${order.location_lng}&navigate=yes`;
  }, [order]);

  async function doAction(action: "pickup" | "start" | "arrived" | "delivered") {
    setBusy(true);
    try {
      const r = await fetch(`/api/driver/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "تعذر تحديث الحالة.");
        return;
      }
      await pull();
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-screen-md px-4 py-12 text-center">
        <p className="text-base font-extrabold">{error ?? "جارٍ التحميل..."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-md px-4">
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100"
          aria-label="رجوع"
        >
          <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <h1 className="text-lg font-extrabold">طلب {order.short_code}</h1>
        <span className={`ms-auto rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusStyles[order.status as keyof typeof statusStyles]}`}>
          {statusLabels[order.status as keyof typeof statusLabels] ?? order.status}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-50 p-5 shadow-soft ring-1 ring-emerald-200">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-pop">
            <Navigation className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-emerald-800">الوجهة - الزبون {order.customer_name}</p>
            <p className="line-clamp-2 text-sm font-extrabold text-emerald-900">{order.customer_address}</p>
          </div>
        </div>
        {order.location_lat != null && order.location_lng != null ? (
          <>
            <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-emerald-200">
              <iframe
                title="موقع التسليم"
                src={`https://maps.google.com/maps?q=${order.location_lat},${order.location_lng}&z=15&output=embed`}
                loading="lazy"
                className="h-44 w-full border-0"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-sm font-extrabold text-white"
                >
                  <Navigation className="h-4 w-4" strokeWidth={2.2} />
                  ابدأ التوجيه
                </a>
              )}
              {wazeUrl && (
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-sky-600 px-3 text-sm font-extrabold text-white"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
                  Waze
                </a>
              )}
            </div>
          </>
        ) : null}
      </div>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <h2 className="mb-3 text-sm font-extrabold">بيانات الزبون</h2>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MapPin className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold">{order.customer_name}</p>
            <p className="text-[12px] text-neutral-500">{order.customer_address}</p>
            {order.notes && (
              <p className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                ملاحظة: {order.notes}
              </p>
            )}
          </div>
          <a
            href={`tel:${order.customer_phone}`}
            aria-label="اتصال"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-pop active:scale-95"
          >
            <Phone className="h-5 w-5" strokeWidth={2.4} />
          </a>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-neutral-500" strokeWidth={2.4} />
          <h2 className="text-sm font-extrabold">المنتجات ({order.order_items.length})</h2>
        </div>
        <ul className="space-y-2">
          {order.order_items.map((it) => (
            <li key={it.id} className="flex items-center justify-between rounded-xl bg-neutral-50 p-2 text-sm">
              <span>{it.product_name} ×{it.quantity}</span>
              <span className="font-extrabold">{formatPrice(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-dashed border-neutral-200 pt-3 text-sm">
          <div className="flex items-center justify-between text-neutral-600">
            <dt className="inline-flex items-center gap-1">
              <Banknote className="h-4 w-4" strokeWidth={2.2} />
              {order.payment_method === "cash" ? "نقدي" : "بطاقة"}
            </dt>
            <dd>المبلغ المطلوب من الزبون</dd>
          </div>
          <div className="flex items-center justify-between text-base">
            <dt className="font-extrabold">المبلغ</dt>
            <dd className="font-extrabold text-emerald-700">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4">
        {nextAction ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void doAction(nextAction.action as "pickup" | "start" | "arrived" | "delivered")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-500 text-base font-extrabold text-white shadow-pop disabled:opacity-60"
          >
            <Truck className="h-5 w-5" strokeWidth={2.4} />
            {nextAction.label}
          </button>
        ) : order.status === "delivered" ? (
          <Link href="/driver" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-white shadow-pop">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
            تم التوصيل بنجاح
          </Link>
        ) : (
          <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-amber-50 text-sm font-extrabold text-amber-700 ring-1 ring-amber-200">
            <Clock className="me-2 h-4 w-4" strokeWidth={2.4} />
            بانتظار تحديث
          </div>
        )}
      </section>
    </div>
  );
}
