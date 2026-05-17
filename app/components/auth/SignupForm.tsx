"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import { BRAND_NAME } from "@/lib/brand";

const googleProvider = new GoogleAuthProvider();

type Role = "customer" | "vendor_staff" | "driver";

async function createSession(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "فشل إنشاء الجلسة.");
  return data as { ok: boolean; role: string };
}

export default function SignupForm() {
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    }).catch(() => {});
  }, []);

  const roleLabel = useMemo(
    () =>
      role === "customer" ? "زبون" : role === "vendor_staff" ? "صاحب متجر/موظف متجر" : "سائق",
    [role],
  );

  async function finishSignup(idToken: string) {
    await createSession(idToken);

    if (role !== "customer") {
      const r = await fetch("/api/onboarding-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedRole: role,
          fullName,
          phone: null,
          vendorName: role === "vendor_staff" ? vendorName : null,
          note: note || null,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "تعذر إرسال طلب الانضمام.");
        return;
      }
    }

    if (role === "customer") {
      router.push("/");
    } else {
      setError(null);
      router.push("/login?signupSuccess=1");
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isFirebaseConfigured) { setError("لم يُضبط Firebase في البيئة."); return; }
    if (!email.trim() || !password) { setError("أدخل البريد الإلكتروني وكلمة المرور."); return; }
    if (!fullName.trim()) { setError("أدخل الاسم الكامل."); return; }
    if (role === "vendor_staff" && !vendorName.trim()) { setError("أدخل اسم المتجر."); return; }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await finishSignup(await credential.user.getIdToken());
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("هذا البريد مسجّل مسبقاً. حاول تسجيل الدخول.");
      } else if (code === "auth/weak-password") {
        setError("كلمة المرور ضعيفة جداً (6 أحرف على الأقل).");
      } else {
        setError(`خطأ: ${code || (err instanceof Error ? err.message : "غير معروف")}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!isFirebaseConfigured) { setError("لم يُضبط Firebase في البيئة."); return; }
    if (!fullName.trim()) { setError("أدخل الاسم الكامل أولاً."); return; }
    if (role === "vendor_staff" && !vendorName.trim()) { setError("أدخل اسم المتجر."); return; }

    setLoading(true);
    try {
      let idToken: string;
      if (isNative) {
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
        const googleIdToken = result.credential?.idToken;
        if (!googleIdToken) throw new Error("لم نستلم رمز جوجل من التطبيق.");
        const cred = await signInWithCredential(
          firebaseAuth,
          GoogleAuthProvider.credential(googleIdToken),
        );
        idToken = await cred.user.getIdToken();
      } else {
        const result = await signInWithPopup(firebaseAuth, googleProvider);
        idToken = await result.user.getIdToken();
      }
      await finishSignup(idToken);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg = err instanceof Error ? err.message : "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        /cancel|closed|12501/i.test(msg)
      ) {
        // ألغى المستخدم العملية
      } else if (code === "auth/popup-blocked") {
        setError("المتصفح حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
      } else if (/10:|DEVELOPER_ERROR/i.test(msg)) {
        setError("إعداد جوجل غير مكتمل (بصمة SHA-1 غير مسجّلة في Firebase لهذا التطبيق).");
      } else {
        setError(`خطأ Google: ${code || msg || "غير معروف"}`);
      }
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
          اختر نوع الحساب ثم أكمل التسجيل.
        </p>

        {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        {!isFirebaseConfigured && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            وضع العرض التجريبي: لم تُضبط مفاتيح Firebase.
          </p>
        )}

        <form onSubmit={handleEmailSignup} className="mt-5 space-y-4">
          <div className="grid gap-2">
            {([
              { v: "customer", t: "زبون", d: "تصفّح المتاجر واطلب — تفعيل فوري بلا مراجعة." },
              { v: "vendor_staff", t: "صاحب متجر", d: "أضف متجرك ومنتجاتك واستقبل الطلبات." },
              { v: "driver", t: "سائق", d: "استلم الطلبات المبثوثة ووصّلها للزبائن." },
            ] as { v: Role; t: string; d: string }[]).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setRole(o.v)}
                className={`rounded-2xl border p-3 text-right transition-colors ${
                  role === o.v
                    ? "border-brand-500 bg-brand-50"
                    : "border-black/10 bg-neutral-50 hover:bg-neutral-100"
                }`}
              >
                <span className="block text-sm font-extrabold text-neutral-900">{o.t}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">{o.d}</span>
              </button>
            ))}
          </div>

          {role !== "customer" && (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-extrabold">سيُراجع طلبك قبل التفعيل</p>
              <p className="mt-1 text-amber-800">
                ستُنشئ حساباً وتُرسل طلب انضمام كـ{roleLabel}. تستخدم الحساب كزبون فوراً، وتتابع
                حالة الطلب من «حسابي ← حالة طلب الانضمام».
              </p>
            </div>
          )}

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

          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
            disabled={loading || !isFirebaseConfigured}
          />

          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
            disabled={loading || !isFirebaseConfigured}
          />

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة إضافية (اختياري)"
            rows={3}
            className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none"
          />

          <button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className="flex w-full items-center justify-center rounded-2xl bg-brand-gradient py-3 text-sm font-extrabold text-white shadow-pop disabled:opacity-50"
          >
            {loading ? "جارٍ الإنشاء..." : `إنشاء حساب ${roleLabel}`}
          </button>
        </form>

        {/* زر Google: يشتغل على الويب (popup) وداخل التطبيق (شاشة جوجل الأصلية) */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || !isFirebaseConfigured}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-3 text-sm font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? "جارٍ…" : "التسجيل مع Google"}
        </button>
        {!isFirebaseConfigured && (
          <p className="mt-2 text-center text-xs text-neutral-500">
            Google غير متاح: لم تُضبط مفاتيح Firebase.
          </p>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.15 0 5.95 1.08 8.17 2.86l6.09-6.09C34.46 3.14 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.22l7.08 5.5C12.44 13.62 17.75 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.68c-.55 2.94-2.2 5.43-4.68 7.1l7.18 5.57C43.18 37.53 46.5 31.45 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.72 28.28A14.6 14.6 0 0 1 9.5 24c0-1.49.26-2.93.72-4.28l-7.08-5.5A23.9 23.9 0 0 0 0 24c0 3.88.93 7.54 2.58 10.77l8.14-6.49z"/>
      <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.5-4.94l-7.18-5.57C28.5 38.35 26.35 39 24 39c-6.25 0-11.56-4.12-13.28-9.72l-8.14 6.49C6.07 43.52 14.42 47 24 47z"/>
    </svg>
  );
}
