"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Phone, User } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { useVendorWorkspace } from "./VendorWorkspace";

type OrderRow = {
  id: string;
  short_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  cancellation_reason: string | null;
  order_items: {
    id: number;
    product_name: string;
    quantity: number;
    line_total: number;
  }[];
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  accepted: "مقبول",
  preparing: "تحضير",
  ready: "جاهز",
  dispatched: "معيّن",
  on_way: "في الطريق",
  delivered: "مكتمل",
  cancelled: "ملغى",
  rejected: "مرفوض",
};

export default function VendorOrdersClient() {
  const { loading: ctxLoading, activeVendorId, error, withVendorQuery } =
    useVendorWorkspace();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectDraftId, setRejectDraftId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVendorId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      void (async () => {
        try {
          const r = await fetch(
            `/api/vendor/orders?vendorId=${encodeURIComponent(activeVendorId)}`,
            { cache: "no-store" },
          );
          const data = (await r.json()) as { orders?: OrderRow[] };
          if (!cancelled && r.ok && Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
        } catch {
          if (!cancelled) setOrders([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [activeVendorId, ctxLoading]);

  async function patchOrder(
    orderId: string,
    body: {
      action: "accept" | "reject" | "ready";
      cancellationReason?: string;
    },
  ) {
    setActingId(orderId);
    setActionError(null);
    try {
      const r = await fetch(withVendorQuery(`/api/vendor/orders/${orderId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setActionError(j.error ?? "تعذر تحديث الطلب.");
        return;
      }
      setRejectDraftId(null);
      setRejectReason("");
      const reload = await fetch(
        `/api/vendor/orders?vendorId=${encodeURIComponent(activeVendorId!)}`,
        { cache: "no-store" },
      );
      const data = (await reload.json()) as { orders?: OrderRow[] };
      if (reload.ok && Array.isArray(data.orders)) setOrders(data.orders);
    } finally {
      setActingId(null);
    }
  }

  const sorted = useMemo(() => {
    if (!activeVendorId) return [];
    return [...orders].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [orders, activeVendorId]);

  if (ctxLoading || (activeVendorId && loading)) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        جارٍ تحميل الطلبات…
      </div>
    );
  }

  if (error || !activeVendorId) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-neutral-600 ring-1 ring-black/5">
        تعذر تحميل الطلبات. تحقق من الربط بمتجر.
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        لا توجد طلبات لهذا المتجر بعد.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actionError && (
        <li className="sm:col-span-2 xl:col-span-3">
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
            {actionError}
          </div>
        </li>
      )}
      {sorted.map((o) => (
        <li
          key={o.id}
          className="flex flex-col rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-extrabold text-white shadow-pop">
              {o.short_code.replace("#", "")}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
              {statusLabels[o.status] ?? o.status}
            </span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-extrabold text-neutral-900">
            <User className="h-4 w-4 text-neutral-400" strokeWidth={2.2} />
            {o.customer_name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[12px] text-neutral-600">
            <Phone className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2.2} />
            {o.customer_phone}
          </p>
          <p className="mt-1 flex items-start gap-2 text-[12px] text-neutral-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2.2} />
            <span className="line-clamp-2">{o.customer_address}</span>
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
              {new Date(o.created_at).toLocaleString("ar-SA")}
            </span>
            <span className="font-extrabold text-emerald-700">
              {formatPrice(o.total)}
            </span>
          </div>
          {o.order_items?.length ? (
            <ul className="mt-2 space-y-1 border-t border-dashed border-neutral-100 pt-2 text-[11px] text-neutral-600">
              {o.order_items.map((li) => (
                <li key={li.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {li.product_name} ×{li.quantity}
                  </span>
                  <span className="shrink-0 font-bold">
                    {formatPrice(li.line_total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {(o.accepted_at || o.ready_at) && (
            <p className="mt-2 text-[10px] text-neutral-400">
              {o.accepted_at
                ? `قُبِل: ${new Date(o.accepted_at).toLocaleString("ar-SA")}`
                : null}
              {o.accepted_at && o.ready_at ? " · " : null}
              {o.ready_at
                ? `جاهز: ${new Date(o.ready_at).toLocaleString("ar-SA")}`
                : null}
            </p>
          )}
          {o.cancellation_reason && o.status === "rejected" ? (
            <p className="mt-1 text-[11px] text-rose-700">{o.cancellation_reason}</p>
          ) : null}
          {(o.status === "new" ||
            o.status === "accepted" ||
            o.status === "preparing") && (
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {o.status === "new" && (
                  <>
                    <button
                      type="button"
                      disabled={actingId === o.id}
                      onClick={() =>
                        void patchOrder(o.id, { action: "accept" })
                      }
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50"
                    >
                      قبول
                    </button>
                    <button
                      type="button"
                      disabled={actingId === o.id}
                      onClick={() => {
                        setRejectDraftId(o.id);
                        setRejectReason("");
                      }}
                      className="rounded-full bg-rose-100 px-3 py-1.5 text-[11px] font-extrabold text-rose-800 disabled:opacity-50"
                    >
                      رفض
                    </button>
                  </>
                )}
                {(o.status === "accepted" || o.status === "preparing") && (
                  <button
                    type="button"
                    disabled={actingId === o.id}
                    onClick={() => void patchOrder(o.id, { action: "ready" })}
                    className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    جاهز للتسليم
                  </button>
                )}
                {o.status === "accepted" && (
                  <button
                    type="button"
                    disabled={actingId === o.id}
                    onClick={() => {
                      setRejectDraftId(o.id);
                      setRejectReason("");
                    }}
                    className="rounded-full bg-rose-100 px-3 py-1.5 text-[11px] font-extrabold text-rose-800 disabled:opacity-50"
                  >
                    رفض
                  </button>
                )}
              </div>
              {rejectDraftId === o.id && (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="سبب الرفض (اختياري)"
                    rows={2}
                    className="w-full rounded-xl border border-black/10 px-2 py-1.5 text-[11px]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actingId === o.id}
                      onClick={() =>
                        void patchOrder(o.id, {
                          action: "reject",
                          cancellationReason: rejectReason.trim() || undefined,
                        })
                      }
                      className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-extrabold text-white disabled:opacity-50"
                    >
                      تأكيد الرفض
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectDraftId(null)}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-bold text-neutral-700"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
