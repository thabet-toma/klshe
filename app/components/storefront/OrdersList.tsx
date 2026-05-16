"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Receipt } from "lucide-react";
import { statusLabels, statusStyles } from "@/lib/order-status";
import { formatPrice } from "@/lib/data";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type OrderSummary = {
  id: string;
  short_code: string;
  status: string;
  total: number;
  created_at: string;
};

export default function OrdersList() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    let active = true;
    async function pull() {
      try {
        const r = await fetch("/api/storefront/orders", { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as { orders?: OrderSummary[] };
        if (!active || !Array.isArray(json.orders)) return;
        setOrders(json.orders);
      } catch {
        if (active) setOrders([]);
      }
    }
    void pull();

    if (isSupabaseConfigured) {
      const sb = createBrowserSupabase();
      const channel = sb
        .channel("storefront-orders-list")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void pull())
        .subscribe();
      return () => {
        active = false;
        void sb.removeChannel(channel);
      };
    }

    return () => {
      active = false;
    };
  }, []);

  if (orders.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-500">
          <Receipt className="h-10 w-10" strokeWidth={1.8} />
        </span>
        <p className="mt-4 text-base font-extrabold">لا توجد طلبات بعد</p>
        <Link
          href="/"
          className="mt-3 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop"
        >
          ابدأ التسوق الآن
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {orders.map((o) => {
        const time = new Date(o.created_at).toLocaleTimeString("ar-IL", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <li key={o.id}>
            <Link
              href={`/orders/${o.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5 transition-shadow hover:shadow-card"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-pop">
                <Receipt className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-neutral-900">
                    طلب {o.short_code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${
                      statusStyles[o.status as keyof typeof statusStyles]
                    }`}
                  >
                    {statusLabels[o.status as keyof typeof statusLabels] ?? o.status}
                  </span>
                </div>
                <p className="truncate text-[12px] text-neutral-500">
                  {time}
                </p>
                <p className="mt-1 text-sm font-extrabold text-brand-600">
                  {formatPrice(o.total)}
                </p>
              </div>
              <ChevronLeft
                className="h-5 w-5 text-neutral-400"
                strokeWidth={2.4}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
