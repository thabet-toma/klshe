"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Loader2, LogOut, MapPin, ShoppingBag, User } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";
import PushSubscriptionCard from "@/app/components/storefront/PushSubscriptionCard";
import AccountSettingsCard from "@/app/components/storefront/AccountSettingsCard";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleSignOut() {
    if (isFirebaseConfigured) {
      await signOut(firebaseAuth);
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    setEmail(null);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-screen-md items-center justify-center gap-2 px-4 py-20 text-sm text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        جارٍ التحميل…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-md px-4 pb-12 pt-4">
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-pop">
            <User className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-neutral-900">حسابي</h1>
            <p className="text-sm text-neutral-500">
              طلباتك وبياناتك مرتبطة بحسابك.
            </p>
          </div>
        </div>

        {!isFirebaseConfigured ? (
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            وضع العرض: لم تُضبط مفاتيح Firebase.
          </p>
        ) : email ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-neutral-600">
              مسجّل كـ{" "}
              <span className="font-extrabold text-neutral-900">{email}</span>
            </p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-extrabold text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.4} />
              تسجيل الخروج
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-neutral-600">
              لست مسجّلاً للدخول. سجّل الدخول لمتابعة الطلبات والمفضلة.
            </p>
            <Link
              href="/login?next=/account"
              className="inline-flex rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop"
            >
              تسجيل الدخول
            </Link>
          </div>
        )}
      </div>

      {email && (
        <section className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href="/orders"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5 hover:bg-neutral-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShoppingBag className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-xs font-extrabold text-neutral-900">طلباتي</span>
          </Link>
          <Link
            href="/addresses"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5 hover:bg-neutral-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <MapPin className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-xs font-extrabold text-neutral-900">العناوين</span>
          </Link>
          <Link
            href="/favorites"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5 hover:bg-neutral-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Heart className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-xs font-extrabold text-neutral-900">المفضلة</span>
          </Link>
        </section>
      )}

      <AccountSettingsCard />

      {email && <PushSubscriptionCard />}
    </div>
  );
}
