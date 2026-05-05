"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Receipt, Save, Trash2 } from "lucide-react";
import { useVendorWorkspace } from "@/app/components/vendor/VendorWorkspace";
import { formatPrice } from "@/lib/data";

type Invoice = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: "cash" | "card" | "credit";
  subtotal: number;
  discount: number;
  total: number;
  note: string | null;
  issued_at: string;
};

type ProductOption = {
  id: string;
  name: string;
  price: number;
};

type Customer = { id: string; name: string };

type ItemDraft = {
  productId: string;
  name: string;
  qty: string;
  unitPrice: string;
};

const newItem = (): ItemDraft => ({
  productId: "",
  name: "",
  qty: "1",
  unitPrice: "0",
});

export default function VendorSalesInvoicesClient() {
  const { activeVendorId } = useVendorWorkspace();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit">("cash");
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);

  function vendorParam(path: string) {
    return activeVendorId ? `${path}${path.includes("?") ? "&" : "?"}vendorId=${activeVendorId}` : path;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, b, c] = await Promise.all([
        fetch(vendorParam("/api/vendor/sales-invoices"), { cache: "no-store" }),
        fetch(vendorParam("/api/vendor/products"), { cache: "no-store" }),
        fetch(vendorParam("/api/vendor/customers"), { cache: "no-store" }),
      ]);
      const ad = (await a.json()) as { invoices?: Invoice[]; error?: string };
      const bd = (await b.json()) as { products?: ProductOption[]; error?: string };
      const cd = (await c.json()) as { customers?: Customer[]; error?: string };
      if (!a.ok) throw new Error(ad.error ?? "تعذر التحميل.");
      setRows(ad.invoices ?? []);
      setProducts(bd.products ?? []);
      setCustomers(cd.customers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [activeVendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, i) => s + Math.round(Number(i.unitPrice) * 100) * Number(i.qty || 0),
        0,
      ),
    [items],
  );
  const discountAgorot = Math.max(0, Math.round(Number(discount) * 100));
  const total = Math.max(0, subtotal - discountAgorot);

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(
      (i) => i.name.trim() && Number(i.qty) > 0 && Number(i.unitPrice) >= 0,
    );
    if (validItems.length === 0) {
      setError("أضف بنداً واحداً على الأقل.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(vendorParam("/api/vendor/sales-invoices"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          customerName,
          customerPhone,
          paymentMethod,
          discount: discountAgorot,
          note,
          items: validItems.map((i) => ({
            productId: i.productId || null,
            name: i.name.trim(),
            qty: Number(i.qty),
            unitPrice: Math.round(Number(i.unitPrice) * 100),
          })),
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        setError(d.error ?? "تعذر الحفظ.");
        return;
      }
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("cash");
      setDiscount("0");
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
        <p className="mb-3 text-sm font-extrabold text-neutral-800">فاتورة بيع جديدة</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="">زبون عابر / غير مسجل</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="اسم الزبون (اختياري)"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="هاتف (اختياري)"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
            inputMode="tel"
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
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  updateItem(idx, {
                    productId: e.target.value,
                    name: p?.name ?? item.name,
                    unitPrice: p ? (p.price / 100).toString() : item.unitPrice,
                  });
                }}
                className="rounded-lg border border-black/10 bg-white px-2 py-2 text-sm sm:col-span-3"
              >
                <option value="">— منتج خارجي —</option>
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
                value={item.unitPrice}
                onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                placeholder="سعر الوحدة (₪)"
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

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card" | "credit")}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="cash">نقدي</option>
            <option value="card">بطاقة</option>
            <option value="credit">آجل (دين على الزبون)</option>
          </select>
          <input
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="خصم (₪)"
            inputMode="decimal"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
          <span className="text-neutral-600">
            المجموع قبل الخصم: <strong>{formatPrice(subtotal)}</strong>
          </span>
          <span className="text-neutral-900">
            الإجمالي: <strong className="text-emerald-700">{formatPrice(total)}</strong>
          </span>
        </div>

        {error && (
          <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
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
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Receipt className="h-6 w-6" strokeWidth={2.2} />
          </span>
          لم تُسجَّل أي فواتير بيع بعد.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-[12px] font-bold text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-start">التاريخ</th>
                <th className="px-3 py-2 text-start">الزبون</th>
                <th className="px-3 py-2 text-start">الدفع</th>
                <th className="px-3 py-2 text-start">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-2 text-neutral-600">
                    {new Date(inv.issued_at).toLocaleString("ar-EG")}
                  </td>
                  <td className="px-3 py-2 font-bold">
                    {inv.customer_name ?? "زبون عابر"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {inv.payment_method === "cash"
                      ? "نقدي"
                      : inv.payment_method === "card"
                        ? "بطاقة"
                        : "آجل"}
                  </td>
                  <td className="px-3 py-2 font-extrabold text-emerald-700">
                    {formatPrice(inv.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
