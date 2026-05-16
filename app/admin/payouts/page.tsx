"use client";

import { useEffect, useState } from "react";
import { Check, X, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/data";
import AdminShell from "@/app/components/admin/AdminShell";

type Payout = {
  id: string;
  vendor_id: string;
  amount: number;
  status: string;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  note: string | null;
};

type Vendor = { id: string; name: string; slug: string };

const statusLabels: Record<string, string> = {
  requested: "مطلوب",
  approved: "مُوافق",
  paid: "مُدفع",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const statusStyles: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700 ring-amber-200",
  approved: "bg-blue-100 text-blue-700 ring-blue-200",
  paid: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-100 text-rose-700 ring-rose-200",
  cancelled: "bg-gray-100 text-gray-700 ring-gray-200",
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch("/api/admin/payouts");
        if (!r.ok) return;
        const json = (await r.json()) as { payouts?: Payout[]; vendors?: Vendor[] };
        if (!active) return;
        setPayouts(json.payouts ?? []);
        setVendors(json.vendors ?? []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleAction(payoutId: string, action: "approve" | "reject" | "mark_paid") {
    setBusyId(payoutId);
    try {
      const r = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, action }),
      });
      if (!r.ok) return;
      const json = (await r.json()) as { payout?: Payout };
      if (json.payout) {
        setPayouts((prev) => prev.map((p) => (p.id === payoutId ? json.payout! : p)));
      }
    } finally {
      setBusyId(null);
    }
  }

  const vendorName = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name ?? vendorId;

  if (loading) {
    return (
      <AdminShell title="المدفوعات والتسوية" subtitle="إدارة دفعات البائعين">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-200" />
          ))}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="المدفوعات والتسوية" subtitle="إدارة دفعات البائعين">
      {payouts.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 shadow-soft ring-1 ring-black/5">
          لا توجد طلبات سحب حالياً.
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <DollarSign className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{vendorName(p.vendor_id)}</p>
                <p className="text-[11px] text-neutral-500">
                  {new Date(p.requested_at).toLocaleDateString("ar-IL")}
                  {p.note && ` · ${p.note}`}
                </p>
              </div>
              <span className="text-base font-extrabold text-brand-600">{formatPrice(p.amount)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${statusStyles[p.status] ?? "bg-neutral-100 text-neutral-700"}`}>
                {statusLabels[p.status] ?? p.status}
              </span>
              {p.status === "requested" && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleAction(p.id, "approve")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white disabled:opacity-50"
                    aria-label="موافقة"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleAction(p.id, "reject")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white disabled:opacity-50"
                    aria-label="رفض"
                  >
                    <X className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>
              )}
              {p.status === "approved" && (
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleAction(p.id, "mark_paid")}
                  className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  تأكيد الدفع
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
