"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/data";

type Customer = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  debt: number;
};

export default function AdminCustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/admin/customers", { cache: "no-store" });
        const d = (await r.json()) as { customers?: Customer[]; error?: string };
        if (!active) return;
        if (!r.ok) throw new Error(d.error ?? "تعذر التحميل.");
        setCustomers(d.customers ?? []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "خطأ.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 shadow-soft ring-1 ring-black/5">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        جارٍ التحميل…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-center text-sm font-bold text-rose-800 ring-1 ring-rose-200">
        {error}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 shadow-soft ring-1 ring-black/5">
        لا يوجد عملاء لعرضهم حالياً.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
      <div className="overflow-x-auto">
        <table className="min-w-full text-start text-sm">
          <thead className="border-b border-black/5 text-[12px] font-bold text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start">الزبون</th>
              <th className="px-4 py-3 text-start">الهاتف</th>
              <th className="px-4 py-3 text-start">الطلبات</th>
              <th className="px-4 py-3 text-start">الإجمالي المنفق</th>
              <th className="px-4 py-3 text-start">الديون</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-extrabold text-white">
                      {c.name[0]}
                    </span>
                    <p className="text-sm font-extrabold">{c.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-600">
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {c.phone || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-600">
                    <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {c.totalOrders}
                  </span>
                </td>
                <td className="px-4 py-3 font-extrabold text-brand-600">
                  {formatPrice(c.totalSpent)}
                </td>
                <td className="px-4 py-3">
                  {c.debt > 0 ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-700 ring-1 ring-rose-200">
                      {formatPrice(c.debt)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
