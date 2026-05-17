"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";

type OnbRequest = {
  id: string;
  requested_role: string;
  status: "pending" | "approved" | "rejected";
  vendor_name: string | null;
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  driver: "سائق",
  vendor_staff: "صاحب متجر",
  customer: "زبون",
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-blue-50 text-blue-800" },
  approved: { label: "معتمَد ✓", cls: "bg-emerald-50 text-emerald-800" },
  rejected: { label: "مرفوض", cls: "bg-rose-50 text-rose-800" },
};

export default function OnboardingStatusPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<OnbRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/onboarding-requests");
        if (r.status === 401) {
          if (active) setError("سجّل الدخول لمتابعة حالة طلبك.");
          return;
        }
        const j = (await r.json()) as { requests?: OnbRequest[]; error?: string };
        if (!r.ok) {
          if (active) setError(j.error ?? "تعذّر جلب الطلبات.");
          return;
        }
        if (active) setRequests((j.requests ?? []).filter((x) => x.requested_role !== "customer"));
      } catch {
        if (active) setError("تعذّر الاتصال بالخادم.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-screen-md px-4 pb-12 pt-4">
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-pop">
            <ClipboardList className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-neutral-900">حالة طلب الانضمام</h1>
            <p className="text-sm text-neutral-500">متابعة طلبات الانضمام كسائق أو صاحب متجر.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
            جارٍ التحميل…
          </div>
        ) : error ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
            <Link
              href="/login?next=/account/onboarding"
              className="inline-flex rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-6 space-y-3 text-sm text-neutral-600">
            <p>لا توجد طلبات انضمام. يمكنك التقديم كسائق أو صاحب متجر من صفحة إنشاء حساب.</p>
            <Link
              href="/signup"
              className="inline-flex rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop"
            >
              تقديم طلب انضمام
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((req) => {
              const st = STATUS[req.status] ?? STATUS.pending;
              return (
                <li key={req.id} className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-black/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-neutral-900">
                      {ROLE_LABEL[req.requested_role] ?? req.requested_role}
                      {req.vendor_name ? ` — ${req.vendor_name}` : ""}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    قُدّم في {new Date(req.created_at).toLocaleDateString("ar")}
                  </p>
                  {req.status === "rejected" && req.note && (
                    <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      ملاحظة: {req.note}
                    </p>
                  )}
                  {req.status === "approved" && (
                    <Link
                      href={req.requested_role === "driver" ? "/driver" : "/vendor"}
                      className="mt-3 inline-flex rounded-xl bg-brand-gradient px-4 py-2 text-xs font-extrabold text-white shadow-pop"
                    >
                      افتح لوحتك (بعد إعادة تسجيل الدخول)
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/account"
          className="mt-6 inline-block text-xs font-bold text-brand-600 hover:underline"
        >
          ← العودة لحسابي
        </Link>
      </div>
    </div>
  );
}
