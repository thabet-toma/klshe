"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useVendorWorkspace } from "./VendorWorkspace";

type MenuCat = {
  id: string;
  name: string;
  sort_order: number;
  vendor_id: string;
};

export default function VendorMenuCategoriesClient() {
  const { loading: ctxLoading, activeVendorId, error, withVendorQuery } =
    useVendorWorkspace();
  const [items, setItems] = useState<MenuCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
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
            `/api/vendor/menu-categories?vendorId=${encodeURIComponent(activeVendorId)}`,
            { cache: "no-store" },
          );
          const j = (await r.json()) as { menuCategories?: MenuCat[] };
          if (!cancelled && r.ok) setItems(j.menuCategories ?? []);
        } catch {
          if (!cancelled) setItems([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [activeVendorId]);

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    if (!activeVendorId || !name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(withVendorQuery("/api/vendor/menu-categories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sortOrder }),
      });
      if (r.ok) {
        setName("");
        setSortOrder(0);
        const list = await fetch(
          `/api/vendor/menu-categories?vendorId=${encodeURIComponent(activeVendorId)}`,
          { cache: "no-store" },
        );
        const j = (await list.json()) as { menuCategories?: MenuCat[] };
        setItems(j.menuCategories ?? []);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!activeVendorId || !window.confirm("حذف هذه الفئة؟")) return;
    setSaving(true);
    try {
      const r = await fetch(withVendorQuery(`/api/vendor/menu-categories/${id}`), {
        method: "DELETE",
      });
      if (r.ok) {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading || (activeVendorId && loading)) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-10 text-sm text-neutral-500 ring-1 ring-black/5">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        جارٍ التحميل…
      </div>
    );
  }

  if (error || !activeVendorId) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-neutral-600 ring-1 ring-black/5">
        لا يمكن تحميل فئات القائمة.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => void addRow(e)}
        className="rounded-3xl bg-white p-4 ring-1 ring-black/5"
      >
        <p className="mb-3 text-sm font-extrabold">إضافة فئة للقائمة</p>
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الفئة (وجبات، مشروبات…)"
            className="min-w-[200px] flex-1 rounded-2xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
            className="w-24 rounded-2xl border border-black/10 px-3 py-2 text-sm"
            title="ترتيب العرض"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            إضافة
          </button>
        </div>
      </form>

      <ul className="divide-y divide-neutral-100 rounded-3xl bg-white ring-1 ring-black/5">
        {items.length === 0 ? (
          <li className="p-8 text-center text-sm text-neutral-500">
            لا توجد فئات بعد. أضف أول فئة أعلاه.
          </li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-extrabold text-neutral-900">{c.name}</p>
                <p className="text-[11px] text-neutral-500">
                  ترتيب: {c.sort_order}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(c.id)}
                disabled={saving}
                className="text-rose-600 hover:text-rose-800"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
