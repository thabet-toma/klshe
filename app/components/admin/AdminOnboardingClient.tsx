"use client";

import { useEffect, useState } from "react";
import { Check, Inbox, Loader2, X } from "lucide-react";

type Req = {
  id: string;
  user_id: string;
  requested_role: "customer" | "vendor_staff" | "driver";
  status: "pending" | "approved" | "rejected";
  full_name: string | null;
  phone: string | null;
  vendor_name: string | null;
  note: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<Req["requested_role"], string> = {
  customer: "عميل",
  vendor_staff: "بائع",
  driver: "سائق",
};

export default function AdminOnboardingClient() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/onboarding?status=${tab}`, { cache: "no-store" });
      const d = (await r.json()) as { requests?: Req[]; error?: string };
      if (!r.ok) throw new Error(d.error ?? "تعذر التحميل.");
      setRows(d.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      await fetch(`/api/admin/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
              tab === t
                ? "bg-brand-600 text-white"
                : "bg-white text-neutral-700 ring-1 ring-black/5"
            }`}
          >
            {t === "pending" ? "قيد الانتظار" : t === "approved" ? "مقبولة" : "مرفوضة"}
          </button>
        ))}
      </div>

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
          <Inbox className="h-6 w-6 text-neutral-400" />
          لا توجد طلبات في هذه الفئة.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-extrabold text-neutral-900">
                    {r.full_name ?? "—"}
                  </p>
                  <p className="text-[12px] text-neutral-500">{r.phone ?? "—"}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-extrabold text-neutral-700">
                  {ROLE_LABEL[r.requested_role]}
                </span>
              </div>
              {r.vendor_name && (
                <p className="mt-2 text-sm text-neutral-700">
                  المتجر: <strong>{r.vendor_name}</strong>
                </p>
              )}
              {r.note && <p className="mt-1 text-sm text-neutral-600">{r.note}</p>}
              <p className="mt-2 text-[11px] text-neutral-400">
                {new Date(r.created_at).toLocaleString("ar-EG")}
              </p>
              {tab === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void act(r.id, "approve")}
                    disabled={busy === r.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                    قبول
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(r.id, "reject")}
                    disabled={busy === r.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    <X className="h-4 w-4" strokeWidth={3} />
                    رفض
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
