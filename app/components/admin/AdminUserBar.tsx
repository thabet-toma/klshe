"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AdminUserBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createBrowserSupabase();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  const onSignOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      router.push("/");
      return;
    }
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {isSupabaseConfigured && (
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-neutral-100 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-200"
          title="تسجيل الخروج"
        >
          <LogOut className="h-4 w-4" strokeWidth={2.4} />
          خروج
        </button>
      )}
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
