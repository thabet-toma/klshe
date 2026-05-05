"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Phone, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { Driver } from "@/lib/types";
import { formatPrice } from "@/lib/data";

const statusBadges = {
  online: { label: "متاح", style: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  busy: { label: "مشغول", style: "bg-amber-100 text-amber-700 ring-amber-200" },
  offline: { label: "غير متصل", style: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
} as const;

async function fetchDriversForAdmin(): Promise<{
  drivers: Driver[];
  error: string | null;
}> {
  try {
    const res = await fetch("/api/admin/drivers", { cache: "no-store" });
    const data = (await res.json()) as { drivers?: Driver[]; error?: string };
    if (!res.ok) {
      return { drivers: [], error: data.error ?? "تعذر تحميل السائقين" };
    }
    return { drivers: data.drivers ?? [], error: null };
  } catch (e) {
    return {
      drivers: [],
      error: e instanceof Error ? e.message : "خطأ غير معروف",
    };
  }
}

export default function DriversAdminClient() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    phone: "",
    avatar: "",
    vehicle: "",
    rating: 4.5,
    status: "offline" as Driver["status"],
    todayOrders: 0,
    earningsToday: 0,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const { drivers: list, error: err } = await fetchDriversForAdmin();
      if (!active) return;
      setDrivers(list);
      setError(err);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm({
      id: "",
      name: "",
      phone: "",
      avatar: "",
      vehicle: "",
      rating: 4.5,
      status: "offline",
      todayOrders: 0,
      earningsToday: 0,
    });
  }

  function startEdit(d: Driver) {
    setEditingId(d.id);
    setForm({
      id: d.id,
      name: d.name,
      phone: d.phone,
      avatar: d.avatar,
      vehicle: d.vehicle,
      rating: d.rating,
      status: d.status,
      todayOrders: d.todayOrders,
      earningsToday: d.earningsToday,
    });
  }

  async function refresh() {
    const { drivers: list, error: err } = await fetchDriversForAdmin();
    setDrivers(list);
    setError(err);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/drivers/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            avatar: form.avatar,
            vehicle: form.vehicle,
            rating: form.rating,
            status: form.status,
            todayOrders: form.todayOrders,
            earningsToday: form.earningsToday,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "فشل التحديث");
      } else {
        const res = await fetch("/api/admin/drivers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.id.trim() || undefined,
            name: form.name,
            phone: form.phone,
            avatar: form.avatar || undefined,
            vehicle: form.vehicle,
            rating: form.rating,
            status: form.status,
            todayOrders: form.todayOrders,
            earningsToday: form.earningsToday,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "فشل الإضافة");
      }
      resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!globalThis.confirm("حذف هذا السائق من القائمة؟")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drivers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "فشل الحذف");
      if (editingId === id) resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] font-medium text-sky-900">
        <strong>تعيين الطلبات:</strong> من «الطلبات» افتح أي طلب واختر السائق من القائمة. السائقون
        الظاهرون هناك يُحمَّلون من نفس البيانات بعد حفظ التعديلات.
      </p>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5 sm:p-5"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-neutral-900">
          {editingId ? (
            <>
              <Pencil className="h-4 w-4 text-brand-600" />
              تعديل بيانات سائق
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 text-brand-600" />
              إضافة سائق
            </>
          )}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {!editingId && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12px] font-bold text-neutral-500">
                المعرّف (اختياري)
              </span>
              <input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-mono"
                placeholder="مثال: d5"
                dir="ltr"
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">الاسم *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-bold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">الهاتف</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-mono"
              dir="ltr"
              placeholder="+9647..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">المركبة</span>
            <input
              value={form.vehicle}
              onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm"
              placeholder="دراجة / سيارة..."
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">
              رابط صورة الرمزية
            </span>
            <input
              value={form.avatar}
              onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-mono"
              dir="ltr"
              placeholder="https://..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">التقييم (0–5)</span>
            <input
              type="number"
              step={0.1}
              min={0}
              max={5}
              value={form.rating}
              onChange={(e) =>
                setForm((f) => ({ ...f, rating: Number.parseFloat(e.target.value) || 0 }))
              }
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">الحالة</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as Driver["status"],
                }))
              }
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-bold"
            >
              <option value="online">متاح</option>
              <option value="busy">مشغول</option>
              <option value="offline">غير متصل</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">
              طلبات اليوم (عرضي)
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.todayOrders}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  todayOrders: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">
              أرباح اليوم (عرضي — بالشيكل)
            </span>
            <input
              type="number"
              min={0}
              step={500}
              value={form.earningsToday}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  earningsToday: Number.parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-brand-gradient px-4 py-2 text-sm font-extrabold text-white shadow-pop disabled:opacity-60"
          >
            {saving ? "جاري الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة السائق"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-center text-sm text-neutral-500">جاري التحميل…</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {drivers.map((d) => {
            const badge = statusBadges[d.status];
            return (
              <li
                key={d.id}
                className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-black/5"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-200">
                    <Image
                      src={d.avatar}
                      alt={d.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold">{d.name}</p>
                    <p className="truncate text-[12px] text-neutral-500">{d.vehicle}</p>
                    <div className="mt-1 flex items-center gap-1 text-[12px]">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      <span className="font-extrabold">{d.rating}</span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${badge.style}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-[11px] font-bold text-neutral-500">طلبات اليوم</p>
                    <p className="text-lg font-extrabold">{d.todayOrders}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-[11px] font-bold text-neutral-500">أرباح اليوم</p>
                    <p className="text-lg font-extrabold">
                      {formatPrice(d.earningsToday)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={`tel:${d.phone}`}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-extrabold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2.4} />
                    اتصال
                  </a>
                  <button
                    type="button"
                    onClick={() => startEdit(d)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    aria-label="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(d.id)}
                    disabled={saving}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && drivers.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          لا يوجد سائقون. أضف أول سائق بالأعلى، أو نفّذ مقطع{" "}
          <code className="rounded bg-neutral-100 px-1 font-mono text-xs">delivery_drivers</code> من{" "}
          <code className="rounded bg-neutral-100 px-1 font-mono text-xs">supabase/schema.sql</code>{" "}
          في SQL Editor إن لم يكن الجدول موجوداً.
        </p>
      )}
    </div>
  );
}
