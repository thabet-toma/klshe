"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MapPin } from "lucide-react";
import { statusLabels, statusStyles } from "@/lib/mock";
import { formatPrice } from "@/lib/data";

type Tab = "active" | "delivered" | "all";
type DriverOrder = {
  id: string;
  short_code: string;
  status: string;
  customer_name: string;
  customer_address: string;
  total: number;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "active", label: "نشطة" },
  { id: "delivered", label: "منجزة" },
  { id: "all", label: "الكل" },
];

export default function DriverOrdersList() {
  const [rows, setRows] = useState<DriverOrder[]>([]);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch("/api/driver/orders", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { orders?: DriverOrder[] };
        if (active && Array.isArray(j.orders)) setRows(j.orders);
      } catch {
        if (active) setRows([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((o) => {
        if (tab === "active") return ["ready", "dispatched", "on_way"].includes(o.status);
        if (tab === "delivered") return o.status === "delivered";
        return true;
      }),
    [rows, tab],
  );

  return (
    <div className="mx-auto w-full max-w-screen-md px-4">
      <div className="mt-1 rounded-2xl bg-white p-1 shadow-soft ring-1 ring-black/5">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            const count =
              t.id === "active"
                ? rows.filter((o) => ["ready", "dispatched", "on_way"].includes(o.status)).length
                : t.id === "delivered"
                  ? rows.filter((o) => o.status === "delivered").length
                  : rows.length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold ${
                  active ? "bg-gradient-to-l from-emerald-600 to-teal-500 text-white shadow-pop" : "text-neutral-600"
                }`}
              >
                {t.label}
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${active ? "bg-white/30" : "bg-neutral-100 text-neutral-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-neutral-500">لا توجد طلبات</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((o) => (
            <li key={o.id}>
              <Link href={`/driver/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-extrabold text-white shadow-pop">
                  {o.short_code.replace("#", "")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{o.customer_name}</p>
                  <p className="flex items-center gap-1 truncate text-[12px] text-neutral-500">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {o.customer_address}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-emerald-700">{formatPrice(o.total)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${statusStyles[o.status as keyof typeof statusStyles]}`}>
                    {statusLabels[o.status as keyof typeof statusLabels] ?? o.status}
                  </span>
                  <ChevronLeft className="h-5 w-5 text-neutral-400" strokeWidth={2.4} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
