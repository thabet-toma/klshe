"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured, clearFirebaseRedirectState } from "@/lib/firebase/config";
import { BRAND_NAME } from "@/lib/brand";

const googleProvider = new GoogleAuthProvider();

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

export default function LoginForm({
  nextPath,
  errorCode,
}: {
  nextPath: string;
  supabaseConfigured?: boolean;
  errorCode?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const redirectHandled = useRef(false);

  // On mount, pick up any pending signInWithRedirect result
  useEffect(() => {
    if (redirectHandled.current || !isFirebaseConfigured) return;
    redirectHandled.current = true;
    void getRedirectResult(firebaseAuth).then(async (result) => {
      if (result?.user) {
        try {
          await finishLogin(await result.user.getIdToken());
        } catch {
          setLocalError("تعذّر إكمال تسجيل الدخول بعد إعادة التوجيه.");
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const errorMessage = useMemo(() => {
    if (errorCode === "forbidden") return "هذا الحساب ليس ضمن مديري المنصة.";
    if (errorCode === "auth") return "تعذّر إكمال تسجيل الدخول. أعد المحاولة.";
    if (errorCode === "vendor_forbidden") return "هذا الحساب غير مربوط بأي متجر.";
    if (errorCode === "driver_forbidden") return "هذا الحساب ليس ضمن السائقين المعتمدين.";
    return null;
  }, [errorCode]);

  function redirectAfterLogin(role: string) {
    const safe =
      nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;

    if (safe && safe !== "/admin") {
      if (safe.startsWith("/admin") && role === "platform_admin") { router.push(safe); return; }
      if (safe.startsWith("/vendor") && (role === "vendor_staff" || role === "platform_admin")) { router.push(safe); return; }
      if (safe.startsWith("/driver") && role === "driver") { router.push(safe); return; }
    }

    if (role === "platform_admin") { router.push("/admin"); return; }
    if (role === "vendor_staff") { router.push("/vendor"); return; }
    if (role === "driver") { router.push("/driver"); return; }
    router.push("/");
  }

  async function finishLogin(idToken: string) {
    const { role } = await createSession(idToken);
    redirectAfterLogin(role);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!isFirebaseConfigured) { setLocalError("لم يُضبط Firebase في البيئة."); return; }
    if (!email.trim() || !password) { setLocalError("أدخل البريد الإلكتروني وكلمة المرور."); return; }

    setLoading(true);
    try {
      const credential = tab === "login"
        ? await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
        : await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await finishLogin(await credential.user.getIdToken());
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setLocalError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } else if (code === "auth/email-already-in-use") {
        setLocalError("هذا البريد مسجّل مسبقاً. حاول تسجيل الدخول.");
      } else if (code === "auth/weak-password") {
        setLocalError("كلمة المرور ضعيفة جداً (6 أحرف على الأقل).");
      } else {
        setLocalError(`خطأ: ${code || (err instanceof Error ? err.message : "غير معروف")}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLocalError(null);
    if (!isFirebaseConfigured) { setLocalError("لم يُضبط Firebase في البيئة."); return; }

    setLoading(true);
    // Clear stale redirect state before attempting sign-in
    clearFirebaseRedirectState();

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      await finishLogin(await result.user.getIdToken());
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // user cancelled — don't show error
      } else if (code === "auth/popup-blocked") {
        // Popup blocked on mobile — fall back to redirect
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
          // The page will redirect away — no further action needed
        } catch {
          setLocalError("المتصفح منع تسجيل الدخول. حاول مرة أخرى أو استخدم البريد الإلكتروني.");
        }
      } else if (code === "auth/unauthorized-domain") {
        setLocalError("هذا النطاق غير مصرّح في Firebase. أضف النطاق في Firebase Console → Authentication → Settings → Authorized domains.");
      } else {
        setLocalError(`خطأ Google: ${code || (err instanceof Error ? err.message : "غير معروف")}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 shadow-card">
        <p className="text-center text-sm font-extrabold text-brand-600">{BRAND_NAME}</p>
        <h1 className="mt-2 text-center text-xl font-extrabold">
          {tab === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>

        {(errorMessage || localError) && (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {localError ?? errorMessage}
          </p>
        )}

        {!isFirebaseConfigured && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            وضع العرض التجريبي: لم تُضبط مفاتيح Firebase.
          </p>
        )}

        {/* Tab switcher */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`rounded-xl px-3 py-2 text-sm font-extrabold ${tab === "login" ? "bg-white text-brand-700 shadow-soft" : "text-neutral-600"}`}
          >
            دخول
          </button>
          <button
            type="button"
            onClick={() => setTab("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-extrabold ${tab === "signup" ? "bg-white text-brand-700 shadow-soft" : "text-neutral-600"}`}
          >
            حساب جديد
          </button>
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || !isFirebaseConfigured}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-3 text-sm font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? "جارٍ…" : "المتابعة مع Google"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/8" />
          <span className="text-xs text-neutral-400">أو</span>
          <div className="h-px flex-1 bg-black/8" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <label className="block text-sm font-bold text-neutral-700">
            البريد الإلكتروني
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none ring-brand-500/30 focus:ring-2"
              placeholder="you@example.com"
              disabled={loading || !isFirebaseConfigured}
            />
          </label>
          <label className="block text-sm font-bold text-neutral-700">
            كلمة المرور
            <input
              type="password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none ring-brand-500/30 focus:ring-2"
              placeholder="••••••••"
              disabled={loading || !isFirebaseConfigured}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className="flex w-full items-center justify-center rounded-2xl bg-brand-gradient py-3 text-sm font-extrabold text-white shadow-pop disabled:opacity-50"
          >
            {loading ? "جارٍ…" : tab === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          <Link href="/" className="font-bold text-brand-600 hover:underline">
            العودة للمتجر
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
