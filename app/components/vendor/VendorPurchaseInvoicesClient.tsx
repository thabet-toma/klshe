"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useVendorWorkspace } from "@/app/components/vendor/VendorWorkspace";
import { formatPrice } from "@/lib/data";

type Invoice = {
  id: string;
  supplier_id: string | null;
  total: number;
  paid: number;
  status: "paid" | "partial" | "unpaid";
  note: string | null;
  issued_at: string;
  vendor_suppliers: { name: string } | null;
};

type Supplier = { id: string; name: string };
type ProductOption = { id: string; name: string };

type ItemDraft = {
  productId: string;
  name: string;
  qty: string;
  unitCost: string;
};

const newItem = (): ItemDraft => ({ productId: "", name: "", qty: "1", unitCost: "0" });

export default function VendorPurchaseInvoicesClient() {
  const { activeVendorId } = useVendorWorkspace();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [paid, setPaid] = useState("0");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);
  const [dup, setDup] = useState<{ newIdx: number; existingIdx: number; name: string } | null>(null);

  function vendorParam(path: string) {
    return activeVendorId ? `${path}${path.includes("?") ? "&" : "?"}vendorId=${activeVendorId}` : path;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, b, c] = await Promise.all([
        fetch(vendorParam("/api/vendor/purchase-invoices"), { cache: "no-store" }),
        fetch(vendorParam("/api/vendor/suppliers"), { cache: "no-store" }),
        fetch(vendorParam("/api/vendor/products"), { cache: "no-store" }),
      ]);
      const ad = (await a.json()) as { invoices?: Invoice[]; error?: string };
      const bd = (await b.json()) as { suppliers?: Supplier[]; error?: string };
      const cd = (await c.json()) as { products?: ProductOption[]; error?: string };
      if (!a.ok) throw new Error(ad.error ?? "تعذر التحميل.");
      setRows(ad.invoices ?? []);
      setSuppliers(bd.suppliers ?? []);
      setProducts(cd.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [activeVendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(
    () =>
      items.reduce(
        (s, i) => s + Math.round(Number(i.unitCost) * 100) * Number(i.qty || 0),
        0,
      ),
    [items],
  );
  const paidAgorot = Math.max(0, Math.round(Number(paid) * 100));

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function selectProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    const name = p?.name ?? "";
    if (productId) {
      const existingIdx = items.findIndex((it, i) => i !== idx && it.productId === productId);
      if (existingIdx !== -1) {
        updateItem(idx, { productId, name });
        setDup({ newIdx: idx, existingIdx, name });
        return;
      }
    }
    updateItem(idx, { productId, name: name || items[idx].name });
  }

  // (أ) دمج البند المكرر في البند الموجود: تُضاف كميته إلى الكمية الحالية ويُحذف السطر الجديد.
  function mergeDuplicate() {
    if (!dup) return;
    const { newIdx, existingIdx } = dup;
    setItems((prev) => {
      const addQty = Number(prev[newIdx]?.qty) || 1;
      return prev
        .map((it, i) =>
          i === existingIdx ? { ...it, qty: String((Number(it.qty) || 0) + addQty) } : it,
        )
        .filter((_, i) => i !== newIdx);
    });
    setDup(null);
  }

  // (ب) إبقاؤه بنداً منفصلاً (قد يختلف سعر الوحدة) — لا تغيير، فقط أغلق الحوار.
  function keepSeparate() {
    setDup(null);
  }

  // إلغاء: تراجع عن اختيار المنتج في السطر الجديد.
  function cancelDuplicate() {
    if (!dup) return;
    updateItem(dup.newIdx, { productId: "" });
    setDup(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(
      (i) => i.name.trim() && Number(i.qty) > 0 && Number(i.unitCost) >= 0,
    );
    if (validItems.length === 0) {
      setError("أضف بنداً واحداً على الأقل.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(vendorParam("/api/vendor/purchase-invoices"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || null,
          paid: paidAgorot,
          note,
          items: validItems.map((i) => ({
            productId: i.productId || null,
            name: i.name.trim(),
            qty: Number(i.qty),
            unitCost: Math.round(Number(i.unitCost) * 100),
          })),
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        setError(d.error ?? "تعذر الحفظ.");
        return;
      }
      setSupplierId("");
      setPaid("0");
      setNote("");
      setItems([newItem()]);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="mb-3 text-sm font-extrabold text-neutral-800">فاتورة شراء جديدة</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="">— مورد غير مسجل —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-xl border border-dashed border-neutral-200 p-2 sm:grid-cols-12"
            >
              <select
                value={item.productId}
                onChange={(e) => selectProduct(idx, e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-2 py-2 text-sm sm:col-span-3"
              >
                <option value="">— ربط بمنتج —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={item.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                placeholder="اسم البند"
                required
                className="rounded-lg border border-black/10 px-2 py-2 text-sm sm:col-span-4"
              />
              <input
                value={item.qty}
                onChange={(e) => updateItem(idx, { qty: e.target.value })}
                placeholder="الكمية"
                inputMode="decimal"
                className="rounded-lg border border-black/10 px-2 py-2 text-sm sm:col-span-2"
              />
              <input
                value={item.unitCost}
                onChange={(e) => updateItem(idx, { unitCost: e.target.value })}
                placeholder="تكلفة الوحدة (₪)"
                inputMode="decimal"
                className="rounded-lg border border-black/10 px-2 py-2 text-sm sm:col-span-2"
              />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                className="flex items-center justify-center rounded-lg bg-rose-50 px-2 py-2 text-rose-700 hover:bg-rose-100 sm:col-span-1"
                aria-label="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newItem()])}
            className="inline-flex items-center gap-1 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-extrabold text-neutral-700 hover:bg-neutral-200"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            إضافة بند
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder="المدفوع (₪)"
            inputMode="decimal"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="text-neutral-600">
              الإجمالي: <strong>{formatPrice(total)}</strong>
            </span>
            <span className="text-neutral-900">
              المتبقّي:{" "}
              <strong className="text-rose-700">
                {formatPrice(Math.max(0, total - paidAgorot))}
              </strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الفاتورة
        </button>
      </form>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          جارٍ التحميل…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <FileText className="h-6 w-6" strokeWidth={2.2} />
          </span>
          لم تُسجَّل أي فواتير شراء بعد.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-[12px] font-bold text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-start">التاريخ</th>
                <th className="px-3 py-2 text-start">المورد</th>
                <th className="px-3 py-2 text-start">الإجمالي</th>
                <th className="px-3 py-2 text-start">المدفوع</th>
                <th className="px-3 py-2 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-2 text-neutral-600">
                    {new Date(inv.issued_at).toLocaleString("ar-EG")}
                  </td>
                  <td className="px-3 py-2 font-bold">
                    {inv.vendor_suppliers?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-extrabold">{formatPrice(inv.total)}</td>
                  <td className="px-3 py-2 text-emerald-700">{formatPrice(inv.paid)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : inv.status === "partial"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {inv.status === "paid"
                        ? "مدفوعة"
                        : inv.status === "partial"
                          ? "جزئية"
                          : "غير مدفوعة"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <p className="text-sm font-extrabold text-neutral-900">المنتج مُضاف مسبقاً</p>
            <p className="mt-2 text-sm text-neutral-600">
              «{dup.name}» موجود بالفعل في هذه الفاتورة. هل تريد دمجه في البند الموجود (زيادة الكمية)،
              أم إضافته كبند منفصل (قد يختلف سعر الوحدة)؟
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={mergeDuplicate}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700"
              >
                دمج في البند الموجود
              </button>
              <button
                type="button"
                onClick={keepSeparate}
                className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-extrabold text-neutral-800 hover:bg-neutral-200"
              >
                إضافته كبند منفصل
              </button>
              <button
                type="button"
                onClick={cancelDuplicate}
                className="rounded-xl px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-700"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
