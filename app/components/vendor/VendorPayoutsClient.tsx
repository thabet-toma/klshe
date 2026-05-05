"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/data";
import { useVendorWorkspace } from "./VendorWorkspace";

type Balance = { available_amount: number; pending_amount: number; updated_at: string | null };
type Payout = {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  note: string | null;
};

export default function VendorPayoutsClient() {
  const { activeVendorId, withVendorQuery, loading: ctxLoading, error } = useVendorWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amountShekel, setAmountShekel] = useState("");

  const load = useCallback(async () => {
    if (!activeVendorId) return;
    const r = await fetch(`/api/vendor/payouts?vendorId=${encodeURIComponent(activeVendorId)}`, {
      cache: "no-store",
    });
    const data = (await r.json()) as { balance?: Balance; payouts?: Payout[]; error?: string };
    if (!r.ok) throw new Error(data.error ?? "تعذر تحميل السحوبات.");
    setBalance(data.balance ?? { available_amount: 0, pending_amount: 0, updated_at: null });
    setPayouts(data.payouts ?? []);
  }, [activeVendorId]);

  useEffect(() => {
    if (!activeVendorId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      void load()
        .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "خطأ في الشبكة."))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [activeVendorId, load]);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountShekel);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMsg("أدخل مبلغ سحب صحيح.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(withVendorQuery("/api/vendor/payouts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountShekel: amount }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) {
        setMsg(data.error ?? "فشل طلب السحب.");
        return;
      }
      setAmountShekel("");
      setMsg("تم إرسال طلب السحب بنجاح.");
      await load();
    } catch {
      setMsg("تعذر إرسال الطلب.");
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading || loading) {
    return <div className="rounded-3xl bg-white p-8 text-sm text-neutral-500 ring-1 ring-black/5">جارٍ التحميل…</div>;
  }
  if (error || !activeVendorId || !balance) {
    return <div className="rounded-3xl bg-white p-8 text-sm text-neutral-600 ring-1 ring-black/5">تعذر تحميل بيانات السحوبات.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="الرصيد المتاح" value={formatPrice(balance.available_amount)} />
        <Card title="الرصيد المعلّق" value={formatPrice(balance.pending_amount)} />
      </div>
      <form onSubmit={(e) => void requestPayout(e)} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        <p className="mb-2 text-sm font-extrabold">طلب سحب جديد</p>
        {msg && <p className="mb-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{msg}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-neutral-600">المبلغ (شيكل)</span>
            <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" type="number" min={0.01} step={0.01} value={amountShekel} onChange={(e) => setAmountShekel(e.target.value)} />
          </label>
          <button disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60">
            {saving ? "جارٍ الإرسال..." : "إرسال الطلب"}
          </button>
        </div>
      </form>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[11px] font-extrabold text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start">المبلغ</th>
              <th className="px-4 py-3 text-start">الحالة</th>
              <th className="px-4 py-3 text-start">تاريخ الطلب</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-bold">{formatPrice(p.amount)}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{new Date(p.requested_at).toLocaleString("ar-EG")}</td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-500" colSpan={3}>لا توجد طلبات سحب بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      <p className="text-xs font-bold text-neutral-500">{title}</p>
      <p className="mt-1 text-xl font-extrabold text-neutral-900">{value}</p>
    </div>
  );
}
