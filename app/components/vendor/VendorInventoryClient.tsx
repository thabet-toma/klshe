"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Package, Plus, Save, Trash2 } from "lucide-react";
import { useVendorWorkspace } from "@/app/components/vendor/VendorWorkspace";
import { formatPrice } from "@/lib/data";

type ProductOption = {
  id: string;
  name: string;
  image: string;
  unit: string;
  price: number;
};

type InventoryRow = {
  id: string;
  product_id: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  unit: string | null;
  updated_at: string;
  products: {
    id: string;
    name: string;
    image: string;
    unit: string;
    price: number;
  } | null;
};

export default function VendorInventoryClient() {
  const { activeVendorId } = useVendorWorkspace();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [saving, setSaving] = useState(false);

  function vendorParam(path: string) {
    return activeVendorId ? `${path}${path.includes("?") ? "&" : "?"}vendorId=${activeVendorId}` : path;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch(vendorParam("/api/vendor/inventory"), { cache: "no-store" }),
        fetch(vendorParam("/api/vendor/products"), { cache: "no-store" }),
      ]);
      const ad = (await a.json()) as { items?: InventoryRow[]; error?: string };
      const bd = (await b.json()) as { products?: ProductOption[]; error?: string };
      if (!a.ok) throw new Error(ad.error ?? "تعذر تحميل المخزون.");
      setItems(ad.items ?? []);
      setProducts(bd.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [activeVendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setSaving(true);
    try {
      const r = await fetch(vendorParam("/api/vendor/inventory"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          stock: Number(stock),
          minStock: Number(minStock),
          costPrice: Math.round(Number(costPrice) * 100),
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        setError(d.error ?? "تعذر الحفظ.");
        return;
      }
      setProductId("");
      setStock("0");
      setMinStock("0");
      setCostPrice("0");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function quickPatch(id: string, patch: Record<string, number>) {
    const r = await fetch(vendorParam(`/api/vendor/inventory/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) await load();
  }

  async function removeRow(id: string) {
    if (!window.confirm("حذف هذا العنصر من المخزون؟")) return;
    const r = await fetch(vendorParam(`/api/vendor/inventory/${id}`), { method: "DELETE" });
    if (r.ok) await load();
  }

  const lowCount = items.filter((i) => Number(i.stock) <= Number(i.min_stock)).length;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-extrabold text-neutral-900">إدارة المخزون</p>
        <p className="text-[12px] text-neutral-500">
          {items.length} عنصر · {lowCount} بحالة مخزون منخفض
        </p>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="mb-2 text-sm font-extrabold text-neutral-800">إضافة/تحديث منتج في المخزون</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm sm:col-span-2"
            required
          >
            <option value="">اختر منتجاً…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="الكمية"
            inputMode="decimal"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            placeholder="الحد الأدنى"
            inputMode="decimal"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="سعر التكلفة (₪)"
            inputMode="decimal"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50 sm:col-span-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          جارٍ تحميل المخزون…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Package className="h-6 w-6" strokeWidth={2.2} />
          </span>
          لا توجد عناصر في المخزون بعد. ابدأ بإضافة منتج.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-[12px] font-bold text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-start">المنتج</th>
                <th className="px-3 py-2 text-start">المتاح</th>
                <th className="px-3 py-2 text-start">الحد الأدنى</th>
                <th className="px-3 py-2 text-start">سعر التكلفة</th>
                <th className="px-3 py-2 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((row) => {
                const isLow = Number(row.stock) <= Number(row.min_stock);
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-bold text-neutral-900">
                      {row.products?.name ?? row.product_id}
                      {isLow && (
                        <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                          <AlertTriangle className="h-3 w-3" strokeWidth={3} />
                          منخفض
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void quickPatch(row.id, { stock: Number(row.stock) - 1 })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-extrabold">
                          {row.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => void quickPatch(row.id, { stock: Number(row.stock) + 1 })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200"
                        >
                          <Plus className="h-3 w-3" strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-neutral-600">{row.min_stock}</td>
                    <td className="px-3 py-2 font-bold">{formatPrice(row.cost_price)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void removeRow(row.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
