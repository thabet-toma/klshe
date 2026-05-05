"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/data";
import { useVendorWorkspace } from "./VendorWorkspace";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  category_id: string;
  is_active: boolean;
  is_offer: boolean;
};

export default function VendorProductsClient() {
  const { loading: ctxLoading, activeVendorId, error, withVendorQuery } =
    useVendorWorkspace();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeVendorId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      void (async () => {
        try {
          const r = await fetch(
            `/api/vendor/products?vendorId=${encodeURIComponent(activeVendorId)}`,
            { cache: "no-store" },
          );
          const data = (await r.json()) as { products?: ProductRow[] };
          if (!cancelled && r.ok && Array.isArray(data.products)) {
            setProducts(data.products);
          }
        } catch {
          if (!cancelled) setProducts([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [activeVendorId, ctxLoading]);

  const rows = activeVendorId ? products : [];

  async function toggleActive(p: ProductRow) {
    if (!activeVendorId) return;
    setSaving(true);
    try {
      const r = await fetch(
        withVendorQuery(`/api/vendor/products/${p.id}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !p.is_active }),
        },
      );
      if (r.ok) {
        setProducts((prev) =>
          prev.map((x) =>
            x.id === p.id ? { ...x, is_active: !p.is_active } : x,
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading || (activeVendorId && loading)) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        جارٍ تحميل المنتجات…
      </div>
    );
  }

  if (error || !activeVendorId) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-neutral-600 ring-1 ring-black/5">
        تعذر تحميل المنتجات.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        لا توجد منتجات مسجّلة لهذا المتجر.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-start text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">المنتج</th>
              <th className="px-4 py-3">التصنيف</th>
              <th className="px-4 py-3">السعر</th>
              <th className="px-4 py-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-neutral-50 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                    <div>
                      <p className="font-extrabold text-neutral-900">{p.name}</p>
                      {p.is_offer && (
                        <span className="text-[11px] font-bold text-rose-600">
                          عرض
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{p.category_id}</td>
                <td className="px-4 py-3 font-bold text-neutral-900">
                  {formatPrice(p.price)}
                  <span className="text-[11px] font-normal text-neutral-500">
                    {" "}
                    / {p.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void toggleActive(p)}
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
                      p.is_active
                        ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {p.is_active ? "نشط" : "مخفي"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
