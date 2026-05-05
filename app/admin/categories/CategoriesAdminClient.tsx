"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

type CategoryRow = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
};

const defaultColor = "from-orange-100 to-orange-200";

async function fetchCategories(): Promise<{ rows: CategoryRow[]; error: string | null }> {
  try {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = (await res.json()) as { categories?: CategoryRow[]; error?: string };
    if (!res.ok) {
      return { rows: [], error: data.error ?? "تعذر تحميل التصنيفات" };
    }
    return { rows: data.categories ?? [], error: null };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "خطأ غير معروف",
    };
  }
}

export default function CategoriesAdminClient() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    emoji: "🛒",
    color: defaultColor,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { rows: next, error: err } = await fetchCategories();
      if (!active) return;
      setRows(next);
      setError(err);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setForm({
      id: c.id,
      name: c.name,
      emoji: c.emoji || "🛒",
      color: c.color || defaultColor,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ id: "", name: "", emoji: "🛒", color: defaultColor });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/categories/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            emoji: form.emoji,
            color: form.color,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "فشل التحديث");
      } else {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.id.trim() || undefined,
            name: form.name,
            emoji: form.emoji,
            color: form.color,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "فشل الإضافة");
      }
      resetForm();
      const { rows: next, error: err } = await fetchCategories();
      setRows(next);
      setError(err);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!globalThis.confirm("حذف هذا التصنيف؟ لن ينجح إن وُجدت منتجات مرتبطة به.")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "فشل الحذف");
      if (editingId === id) resetForm();
      const { rows: next, error: err } = await fetchCategories();
      setRows(next);
      setError(err);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
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
              تعديل تصنيف
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 text-brand-600" />
              إضافة تصنيف
            </>
          )}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {!editingId && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12px] font-bold text-neutral-500">
                المعرّف (اختياري — يُولَّد تلقائياً إن تُرك فارغاً)
              </span>
              <input
                name="id"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-mono"
                placeholder="مثال: c11"
                dir="ltr"
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">الاسم *</span>
            <input
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-bold"
              placeholder="مثال: عناية شخصية"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">أيقونة (إيموجي)</span>
            <input
              name="emoji"
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-neutral-500">
              لون الخلفية (صنف Tailwind)
            </span>
            <input
              name="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm font-mono"
              dir="ltr"
              placeholder={defaultColor}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-brand-gradient px-4 py-2 text-sm font-extrabold text-white shadow-pop disabled:opacity-60"
          >
            {saving ? "جاري الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة"}
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

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
        <div className="border-b border-black/5 px-4 py-3">
          <h2 className="text-sm font-extrabold text-neutral-900">قائمة التصنيفات</h2>
          <p className="text-[12px] text-neutral-500">
            التعديلات تُحفظ في Supabase وتظهر في المتجر بعد التحديث.
          </p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-sm text-neutral-500">جاري التحميل…</p>
          ) : (
            <table className="min-w-full text-start text-sm">
              <thead className="border-b border-black/5 text-[12px] font-bold text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-start">القسم</th>
                  <th className="px-4 py-3 text-start">المعرّف</th>
                  <th className="px-4 py-3 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${
                            c.color || defaultColor
                          }`}
                          aria-hidden
                        >
                          {c.emoji || "🛒"}
                        </span>
                        <span className="font-extrabold text-neutral-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-neutral-500" dir="ltr">
                      {c.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          disabled={saving}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
