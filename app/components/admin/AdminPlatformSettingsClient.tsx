"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

type SettingsBag = {
  default_commission_rate?: number;
  default_delivery_base_fee?: number;
  default_delivery_per_km?: number;
  min_order_total?: number;
  support_phone?: string;
  support_email?: string;
};

export default function AdminPlatformSettingsClient() {
  const [s, setS] = useState<SettingsBag>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/platform-settings", { cache: "no-store" });
      const d = (await r.json()) as { settings?: SettingsBag; error?: string };
      if (!r.ok) throw new Error(d.error ?? "تعذر التحميل.");
      setS(d.settings ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const r = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (r.ok) setMsg("تم الحفظ بنجاح.");
      else {
        const d = (await r.json()) as { error?: string };
        setError(d.error ?? "تعذر الحفظ.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 ring-1 ring-black/5">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        جارٍ التحميل…
      </div>
    );
  }

  function setField<K extends keyof SettingsBag>(k: K, v: SettingsBag[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="mb-2 text-sm font-extrabold text-neutral-800">إعدادات عامة</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="عمولة المنصة الافتراضية %"
            value={s.default_commission_rate?.toString() ?? ""}
            onChange={(v) => setField("default_commission_rate", Number(v))}
          />
          <Field
            label="الحد الأدنى للطلب (₪)"
            value={s.min_order_total?.toString() ?? ""}
            onChange={(v) => setField("min_order_total", Number(v))}
          />
          <Field
            label="رسوم توصيل أساسية (₪)"
            value={s.default_delivery_base_fee?.toString() ?? ""}
            onChange={(v) => setField("default_delivery_base_fee", Number(v))}
          />
          <Field
            label="رسوم لكل كم (₪)"
            value={s.default_delivery_per_km?.toString() ?? ""}
            onChange={(v) => setField("default_delivery_per_km", Number(v))}
          />
        </div>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <p className="mb-2 text-sm font-extrabold text-neutral-800">دعم وتواصل</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="هاتف الدعم"
            value={s.support_phone ?? ""}
            onChange={(v) => setField("support_phone", v)}
          />
          <Field
            label="بريد الدعم"
            value={s.support_email ?? ""}
            onChange={(v) => setField("support_email", v)}
          />
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {msg}
        </div>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-neutral-600">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
      />
    </label>
  );
}
