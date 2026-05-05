"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Save, Trash2 } from "lucide-react";
import { useVendorWorkspace } from "@/app/components/vendor/VendorWorkspace";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
};

export default function VendorSuppliersClient() {
  const { activeVendorId } = useVendorWorkspace();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function vendorParam(path: string) {
    return activeVendorId ? `${path}${path.includes("?") ? "&" : "?"}vendorId=${activeVendorId}` : path;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(vendorParam("/api/vendor/suppliers"), { cache: "no-store" });
      const d = (await r.json()) as { suppliers?: Supplier[]; error?: string };
      if (!r.ok) throw new Error(d.error ?? "تعذر تحميل الموردين.");
      setRows(d.suppliers ?? []);
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
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(vendorParam("/api/vendor/suppliers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, note }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        setError(d.error ?? "تعذر الحفظ.");
        return;
      }
      setName("");
      setPhone("");
      setNote("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("حذف هذا المورد؟")) return;
    const r = await fetch(vendorParam(`/api/vendor/suppliers/${id}`), { method: "DELETE" });
    if (r.ok) await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="mb-2 text-sm font-extrabold text-neutral-800">إضافة مورد جديد</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المورد"
            required
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="الهاتف"
            inputMode="tel"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          جارٍ التحميل…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Building2 className="h-6 w-6" strokeWidth={2.2} />
          </span>
          لم تُضِف أي مورد بعد.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-black/5 bg-neutral-50 text-[12px] font-bold text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-start">الاسم</th>
                <th className="px-3 py-2 text-start">الهاتف</th>
                <th className="px-3 py-2 text-start">ملاحظة</th>
                <th className="px-3 py-2 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-bold">{row.name}</td>
                  <td className="px-3 py-2 text-neutral-600">{row.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-600">{row.note ?? "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void remove(row.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
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
