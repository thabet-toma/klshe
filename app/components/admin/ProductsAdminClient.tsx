"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/data";

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  old_price: number | null;
  unit: string;
  image: string;
  badge: string | null;
  category_id: string;
  vendor_id: string | null;
  menu_category_id: string | null;
  is_offer: boolean;
  is_trending: boolean;
  is_active: boolean;
};

type VendorOpt = { id: string; name: string; slug: string };
type CatOpt = { id: string; name: string };

export default function ProductsAdminClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [vendors, setVendors] = useState<VendorOpt[]>([]);
  const [categories, setCategories] = useState<CatOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newVendorId, setNewVendorId] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editVendorId, setEditVendorId] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pr, ven, cat] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/vendors", { cache: "no-store" }),
        fetch("/api/admin/categories", { cache: "no-store" }),
      ]);
      const pj = (await pr.json()) as { products?: ProductRow[]; error?: string };
      const vj = (await ven.json()) as { vendors?: VendorOpt[] };
      const cj = (await cat.json()) as { categories?: CatOpt[] };

      if (!pr.ok) {
        setError(pj.error ?? "تعذر تحميل المنتجات.");
        setProducts([]);
        return;
      }
      setProducts(pj.products ?? []);
      setVendors(vj.vendors ?? []);
      setCategories(cj.categories ?? []);
    } catch {
      setError("خطأ في الشبكة.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function toggleActive(p: ProductRow) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.is_active }),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setError(j.error ?? "فشل التحديث.");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    if (!window.confirm("حذف هذا المنتج نهائياً من القاعدة؟")) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setError(j.error ?? "فشل الحذف.");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: ProductRow) {
    setEditing(p);
    setEditName(p.name);
    setEditPrice(String(p.price / 100));
    setEditUnit(p.unit);
    setEditImage(p.image);
    setEditCategoryId(p.category_id);
    setEditVendorId(p.vendor_id ?? vendors[0]?.id ?? "");
  }

  async function uploadImage(file: File) {
    if (!editing) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("vendorId", editVendorId || editing.vendor_id || vendors[0]?.id || "");
      const r = await fetch("/api/admin/upload-asset", {
        method: "POST",
        body: fd,
      });
      const j = (await r.json()) as { error?: string; url?: string };
      if (!r.ok || !j.url) {
        setError(j.error ?? "فشل رفع الصورة.");
        return;
      }
      setEditImage(j.url);
    } finally {
      setUploading(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          price: Number.parseFloat(editPrice),
          unit: editUnit.trim(),
          image: editImage.trim(),
          categoryId: editCategoryId,
          vendorId: editVendorId,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "فشل تعديل المنتج.");
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const price = Number.parseFloat(newPrice);
    if (!name || Number.isNaN(price) || price < 0) {
      setError("اسم وسعر صالحين مطلوبان.");
      return;
    }
    const vid = newVendorId || vendors[0]?.id;
    const cid = newCategoryId || categories[0]?.id;
    if (!cid || !vid) {
      setError("اختر التصنيف والمتجر.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price,
          categoryId: cid,
          vendorId: vid,
          unit: "قطعة",
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "فشل الإنشاء.");
        return;
      }
      setNewName("");
      setNewPrice("");
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-sm text-neutral-500 ring-1 ring-black/5">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        جارٍ التحميل…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          البيانات من Supabase عند التهيئة؛ وإلا يعرض النموذج المحلي للمعاينة فقط.
        </p>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-extrabold text-white shadow-pop disabled:opacity-50"
          disabled={saving || vendors.length === 0 || categories.length === 0}
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          منتج جديد
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={(e) => void addProduct(e)}
          className="rounded-2xl bg-white p-4 ring-1 ring-black/5"
        >
          <p className="mb-3 text-sm font-extrabold">إضافة منتج</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-[11px] font-bold text-neutral-600">
              الاسم
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">
              السعر
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">
              التصنيف العام
              <select
                value={newCategoryId || categories[0]?.id || ""}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">
              المتجر
              <select
                value={newVendorId || vendors[0]?.id || ""}
                onChange={(e) => setNewVendorId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form
          onSubmit={(e) => void saveEdit(e)}
          className="rounded-2xl bg-white p-4 ring-1 ring-black/5"
        >
          <p className="mb-3 text-sm font-extrabold">تعديل منتج</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-[11px] font-bold text-neutral-600">الاسم
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">السعر
              <input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">الوحدة
              <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">التصنيف
              <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">المتجر
              <select value={editVendorId} onChange={(e) => setEditVendorId(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm">
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-bold text-neutral-600">رابط الصورة
              <input value={editImage} onChange={(e) => setEditImage(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
              />
              {uploading ? "جار رفع الصورة..." : "رفع صورة من الجهاز"}
            </label>
            <button type="submit" disabled={saving || uploading} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">حفظ التعديل</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700">إلغاء</button>
          </div>
        </form>
      )}

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-black/5 text-[12px] font-bold text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-start">المنتج</th>
                <th className="px-4 py-3 text-start">المتجر</th>
                <th className="px-4 py-3 text-start">الوحدة</th>
                <th className="px-4 py-3 text-start">السعر</th>
                <th className="px-4 py-3 text-start">نشط</th>
                <th className="px-4 py-3 text-start w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-extrabold">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-neutral-600">
                    {p.vendor_id?.slice(0, 8) ?? "—"}…
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{p.unit}</td>
                  <td className="px-4 py-3 font-extrabold">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(p)}
                      disabled={saving}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        p.is_active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {p.is_active ? "نعم" : "لا"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        disabled={saving}
                        className="text-sky-600 hover:text-sky-800"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeProduct(p.id)}
                        disabled={saving}
                        className="text-rose-600 hover:text-rose-800"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
