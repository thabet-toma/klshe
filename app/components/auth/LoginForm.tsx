"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND_NAME } from "@/lib/brand";

export default function LoginForm({
  nextPath,
  errorCode,
  supabaseConfigured,
}: {
  nextPath: string;
  errorCode?: string;
  supabaseConfigured: boolean;
}) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const errorMessage = useMemo(() => {
    if (errorCode === "forbidden") {
      return "هذا الحساب ليس ضمن مديري المنصة. اطلب صلاحية من المسؤول أو سجّل الخروج ثم جرّب بريداً آخر.";
    }
    if (errorCode === "auth") {
      return "تعذّر إكمال تسجيل الدخول. أعد المحاولة أو طلب رابطاً جديداً.";
    }
    if (errorCode === "vendor_forbidden") {
      return "هذا الحساب غير مربوط بأي متجر. اطلب دعوة من إدارة المنصة، أو سجّل الخروج.";
    }
    if (errorCode === "driver_forbidden") {
      return "هذا الحساب ليس ضمن السائقين المعتمدين. تواصل مع إدارة المنصة.";
    }
    return null;
  }, [errorCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!supabaseConfigured || !isSupabaseConfigured) {
      setLocalError("لم يُضبط Supabase في البيئة.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const origin =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        window.location.origin;
      const next = nextPath.startsWith("/") ? nextPath : "/admin";
      let error: { message: string } | null = null;
      if (method === "email") {
        const trimmed = email.trim();
        if (!trimmed) {
          setLocalError("أدخل البريد الإلكتروني.");
          return;
        }
        const r = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        error = r.error;
      } else {
        const normalized = phone.replace(/\s+/g, "");
        if (!normalized || !normalized.startsWith("+")) {
          setLocalError("أدخل رقم هاتف بصيغة دولية مثل +972...");
          return;
        }
        const r = await supabase.auth.signInWithOtp({
          phone: normalized,
        });
        error = r.error;
      }
      if (error) {
        setLocalError(error.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 shadow-card">
        <p className="text-center text-sm font-extrabold text-brand-600">{BRAND_NAME}</p>
        <h1 className="mt-2 text-center text-xl font-extrabold">تسجيل الدخول</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">
          اختر البريد أو الهاتف لتلقي رمز/رابط الدخول.
        </p>

        {(errorMessage || localError) && (
          <p
            className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {localError ?? errorMessage}
          </p>
        )}

        {!supabaseConfigured && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            وضع العرض التجريبي: لم تُضبط مفاتيح Supabase، لذلك الإدارة متاحة بدون تسجيل دخول عبر المتصفح.
          </p>
        )}

        {sent ? (
          <p className="mt-6 text-center text-sm font-semibold text-neutral-700">
            تم إرسال طلب الدخول. تحقق من بريدك أو رسائل الهاتف.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={`rounded-xl px-3 py-2 text-sm font-extrabold ${
                  method === "email" ? "bg-white text-brand-700 shadow-soft" : "text-neutral-600"
                }`}
              >
                بريد
              </button>
              <button
                type="button"
                onClick={() => setMethod("phone")}
                className={`rounded-xl px-3 py-2 text-sm font-extrabold ${
                  method === "phone" ? "bg-white text-brand-700 shadow-soft" : "text-neutral-600"
                }`}
              >
                هاتف
              </button>
            </div>
            {method === "email" ? (
              <label className="block text-sm font-bold text-neutral-700">
                البريد الإلكتروني
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none ring-brand-500/30 focus:ring-2"
                  placeholder="you@example.com"
                  disabled={loading || !supabaseConfigured}
                />
              </label>
            ) : (
              <label className="block text-sm font-bold text-neutral-700">
                رقم الهاتف (دولي)
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none ring-brand-500/30 focus:ring-2"
                  placeholder="+9725xxxxxxxx"
                  disabled={loading || !supabaseConfigured}
                />
              </label>
            )}
            <button
              type="submit"
              disabled={loading || !supabaseConfigured}
              className="flex w-full items-center justify-center rounded-2xl bg-brand-gradient py-3 text-sm font-extrabold text-white shadow-pop disabled:opacity-50"
            >
              {loading ? "جارٍ الإرسال…" : method === "email" ? "إرسال رابط الدخول" : "إرسال رمز OTP"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-500">
          <Link href="/" className="font-bold text-brand-600 hover:underline">
            العودة للمتجر
          </Link>
        </p>
      </div>
    </div>
  );
}
