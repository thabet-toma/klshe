"use client";

import { useState } from "react";
import { Truck } from "lucide-react";

// T2.1: بطاقة أدمن «تجربة كسائق». بدء = صفّ سائق مؤقّت + فتح /driver.
// إنهاء = حذف الصفّ المؤقّت (لا تغيير دور دائم).
export default function AdminImpersonateDriverCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/impersonate-driver", { method: "POST" });
      const data = (await res.json()) as { redirect?: string; error?: string; message?: string };
      if (!res.ok) {
        setErr(data.error ?? "تعذّر بدء التجربة.");
        return;
      }
      window.location.href = data.redirect ?? "/driver";
    } catch {
      setErr("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/impersonate-driver", { method: "DELETE" });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErr(data.error ?? "تعذّر إنهاء التجربة.");
        return;
      }
      setMsg(data.message ?? "أُنهيت التجربة وحُذف صفّ السائق التجريبي.");
    } catch {
      setErr("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Truck className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-neutral-900">تجربة كسائق</h2>
          <p className="text-xs text-neutral-500">
            افتح لوحة السائق باسمك مؤقتاً لاختبار البثّ والمطالبة والتسليم. بلا تغيير دور دائم.
          </p>
        </div>
      </div>

      {err && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {err}
        </p>
      )}
      {msg && (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          className="flex-1 rounded-2xl bg-brand-gradient py-3 text-sm font-extrabold text-white shadow-pop disabled:opacity-50"
        >
          {busy ? "جارٍ…" : "بدء التجربة وفتح لوحة السائق"}
        </button>
        <button
          type="button"
          onClick={() => void stop()}
          disabled={busy}
          className="rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
        >
          إنهاء التجربة
        </button>
      </div>
    </section>
  );
}
