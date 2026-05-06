"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config";

export default function AdminUserBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setEmail(user?.email ?? null);
    });
    return unsub;
  }, []);

  const onSignOut = useCallback(async () => {
    if (isFirebaseConfigured) {
      await signOut(firebaseAuth);
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="flex h-10 items-center gap-1.5 rounded-xl bg-neutral-100 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-200"
        title="تسجيل الخروج"
      >
        <LogOut className="h-4 w-4" strokeWidth={2.4} />
        خروج
      </button>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-extrabold text-white">
        {email ? email.charAt(0).toUpperCase() : "م"}
      </span>
      <div className="leading-tight">
        <p className="text-sm font-extrabold">مدير المتجر</p>
        <p className="max-w-[140px] truncate text-[11px] text-neutral-500" title={email ?? undefined}>
          {email ?? "admin@jetek.app"}
        </p>
      </div>
    </div>
  );
}
