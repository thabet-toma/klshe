"use client";

import { useEffect, useState } from "react";
import { Loader2, MinusCircle, PlusCircle, Save, Trash2, Users } from "lucide-react";
import { useVendorWorkspace } from "@/app/components/vendor/VendorWorkspace";
import { formatPrice } from "@/lib/data";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
  created_at: string;
};

export default function VendorCustomersClient() {
  const { activeVendorId } = useVendorWorkspace();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  function vendorParam(path: string) {
    return activeVendorId ? `${path}${path.includes("?") ? "&" : "?"}vendorId=${activeVendorId}` : path;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(vendorParam("/api/vendor/customers"), { cache: "no-store" });
      const d = (await r.json()) as { customers?: Customer[]; error?: string };
      if (!r.ok) throw new Error(d.error ?? "تعذر التحميل.");
      setRows(d.customers ?? []);
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
      const r = await fetch(vendorParam("/api/vendor/customers"), {
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

  async function record(customerId: string, type: "debt" | "payment") {
    const v = window.prompt(type === "debt" ? "قيمة الدين بالشيكل" : "قيمة السداد بالشيكل");
    if (!v) return;
    const amount = Math.round(Number(v) * 100);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusyId(customerId);
    try {
      const r = await fetch(vendorParam(`/api/vendor/customers/${customerId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount }),
      });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("حذف هذا الزبون وسجله؟")) return;
    const r = await fetch(vendorParam(`/api/vendor/customers/${id}`), { method: "DELETE" });
    if (r.ok) await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="mb-2 text-sm font-extrabold text-neutral-800">إضافة زبون</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم"
            required
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="الهاتف"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
            inputMode="tel"
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
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
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
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
            <Users className="h-6 w-6" strokeWidth={2.2} />
          </span>
          لم تُضِف أي زبون بعد.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-extrabold text-neutral-900">{row.name}</p>
                  {row.phone && (
                    <p className="text-[12px] text-neutral-500">{row.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(row.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-sm font-extrabold ${
                  row.balance > 0
                    ? "bg-rose-50 text-rose-700"
                    : row.balance < 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-neutral-100 text-neutral-700"
                }`}
              >
                الرصيد: {formatPrice(row.balance)}{" "}
                <span className="text-[11px] font-bold opacity-70">
                  {row.balance > 0 ? "(دين عليه)" : row.balance < 0 ? "(زائد)" : "(صفر)"}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void record(row.id, "debt")}
                  disabled={busyId === row.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-600 px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" strokeWidth={2.4} />
                  دين
                </button>
                <button
                  type="button"
                  onClick={() => void record(row.id, "payment")}
                  disabled={busyId === row.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  <MinusCircle className="h-4 w-4" strokeWidth={2.4} />
                  سداد
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
