"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND_NAME } from "@/lib/brand";

type Role = "customer" | "vendor_staff" | "driver";
type Method = "email" | "phone";

export default function SignupForm({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const [role, setRole] = useState<Role>("customer");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = useMemo(
    () =>
      role === "customer" ? "زبون" : role === "vendor_staff" ? "صاحب متجر/موظف متجر" : "سائق",
    [role],
  );

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured || !isSupabaseConfigured) {
      setError("لم يُضبط Supabase في البيئة.");
      return;
    }

    setLoading(true);
    try {
      const sb = createBrowserSupabase();
      let err: string | null = null;
      if (method === "email") {
        const trimmed = email.trim();
        if (!trimmed) {
          setError("أدخل البريد الإلكتروني.");
          return;
        }
        const origin =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
          window.location.origin;
        const { error: e1 } = await sb.auth.signInWithOtp({
          email: trimmed,
          options: { emailRedirectTo: `${origin}/auth/callback?next=/signup` },
        });
        err = e1?.message ?? null;
      } else {
        const normalized = phone.replace(/\s+/g, "");
        if (!normalized.startsWith("+")) {
          setError("أدخل رقم هاتف بصيغة دولية مثل +972...");
          return;
        }
        const { error: e2 } = await sb.auth.signInWithOtp({ phone: normalized });
        err = e2?.message ?? null;
      }
      if (err) {
        setError(err);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function submitOnboarding() {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/onboarding-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedRole: role,
          fullName,
          phone: phone || null,
          vendorName: role === "vendor_staff" ? vendorName : null,
          note: note || null,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "تعذر إرسال طلب الانضمام.");
        return;
      }
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white p-8 shadow-card">
        <p className="text-center text-sm font-extrabold text-brand-600">{BRAND_NAME}</p>
        <h1 className="mt-2 text-center text-xl font-extrabold">إنشاء حساب</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">
          اختر نوع الحساب ثم أكمل التحقق وإرسال طلب الانضمام.
        </p>

        {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {submitted && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            تم إرسال طلبك كـ {roleLabel}. ستتم مراجعته من إدارة المنصة.
          </p>
        )}

        <form onSubmit={sendOtp} className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-neutral-100 p-1">
            <button type="button" onClick={() => setRole("customer")} className={`rounded-xl px-2 py-2 text-xs font-extrabold ${role === "customer" ? "bg-white text-brand-700" : "text-neutral-600"}`}>زبون</button>
            <button type="button" onClick={() => setRole("vendor_staff")} className={`rounded-xl px-2 py-2 text-xs font-extrabold ${role === "vendor_staff" ? "bg-white text-brand-700" : "text-neutral-600"}`}>متجر</button>
            <button type="button" onClick={() => setRole("driver")} className={`rounded-xl px-2 py-2 text-xs font-extrabold ${role === "driver" ? "bg-white text-brand-700" : "text-neutral-600"}`}>سائق</button>
          </div>

          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم الكامل"
            className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
          />

          {role === "vendor_staff" && (
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="اسم المتجر"
              className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
            />
          )}

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
            <button type="button" onClick={() => setMethod("email")} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${method === "email" ? "bg-white text-brand-700" : "text-neutral-600"}`}>بريد</button>
            <button type="button" onClick={() => setMethod("phone")} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${method === "phone" ? "bg-white text-brand-700" : "text-neutral-600"}`}>هاتف</button>
          </div>

          {method === "email" ? (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
              disabled={loading || !supabaseConfigured}
            />
          ) : (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+9725xxxxxxxx"
              className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
              disabled={loading || !supabaseConfigured}
            />
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة إضافية (اختياري)"
            rows={3}
            className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
          />

          <button
            type="submit"
            disabled={loading || !supabaseConfigured}
            className="flex w-full items-center justify-center rounded-2xl bg-brand-gradient py-3 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {loading ? "جارٍ الإرسال..." : "إرسال OTP/رابط تحقق"}
          </button>
        </form>

        {sent && !submitted && (
          <button
            type="button"
            onClick={() => void submitOnboarding()}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 py-3 text-sm font-extrabold text-brand-700 disabled:opacity-50"
          >
            تم التحقق؟ أرسل طلب الانضمام
          </button>
        )}

        <p className="mt-6 text-center text-xs text-neutral-500">
          لديك حساب؟{" "}
          <Link href="/login" className="font-bold text-brand-600 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
