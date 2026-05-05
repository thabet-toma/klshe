"use client";

import { useEffect, useState } from "react";
import { Loader2, Power, Save, Store } from "lucide-react";

type Vendor = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  commission_rate?: number;
};

export default function AdminVendorsClient() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/vendors", { cache: "no-store" });
      const d = (await r.json()) as { vendors?: Vendor[]; error?: string };
      if (!r.ok) throw new Error(d.error ?? "تعذر التحميل.");
      setRows(d.vendors ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(id: string, isActive: boolean) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveCommission(id: string) {
    const v = Number(edits[id]);
    if (!Number.isFinite(v)) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_rate: v }),
      });
      if (r.ok) {
        setEdits((p) => ({ ...p, [id]: "" }));
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        جارٍ التحميل…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <Store className="h-6 w-6 text-neutral-400" />
          لا يوجد متاجر بعد.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-[12px] font-bold text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-start">الاسم</th>
                <th className="px-3 py-2 text-start">المعرف</th>
                <th className="px-3 py-2 text-start">الحالة</th>
                <th className="px-3 py-2 text-start">العمولة %</th>
                <th className="px-3 py-2 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className="px-3 py-2 font-extrabold text-neutral-900">{v.name}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
                    {v.slug}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                        v.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {v.is_active ? "مُفعَّل" : "موقوف"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        defaultValue={String(v.commission_rate ?? 10)}
                        onChange={(e) =>
                          setEdits((p) => ({ ...p, [v.id]: e.target.value }))
                        }
                        inputMode="decimal"
                        className="w-16 rounded-lg border border-black/10 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void saveCommission(v.id)}
                        disabled={busyId === v.id || !edits[v.id]}
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-extrabold text-white disabled:opacity-40"
                      >
                        <Save className="h-3 w-3" strokeWidth={3} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void toggle(v.id, v.is_active)}
                      disabled={busyId === v.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold ${
                        v.is_active
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      <Power className="h-3 w-3" strokeWidth={3} />
                      {v.is_active ? "إيقاف" : "تفعيل"}
                    </button>
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
