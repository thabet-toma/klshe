"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { agorotToShekel } from "@/lib/currency/agorot";
import { useVendorWorkspace } from "./VendorWorkspace";

type VendorProfile = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  min_order_amount: number;
  delivery_fee_base: number;
  delivery_fee_per_km: number;
  default_prep_minutes: number;
  opening_hours: Record<string, string> | null;
  is_open: boolean;
  address_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
};

export default function VendorSettingsClient() {
  const { activeVendorId, withVendorQuery, loading: ctxLoading, error } = useVendorWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [openingHoursText, setOpeningHoursText] = useState("{}");
  const [uploadKind, setUploadKind] = useState<"logo" | "banner" | null>(null);

  useEffect(() => {
    if (!activeVendorId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      void (async () => {
        try {
          const r = await fetch(`/api/vendor/profile?vendorId=${encodeURIComponent(activeVendorId)}`, {
            cache: "no-store",
          });
          const data = (await r.json()) as { vendor?: VendorProfile; error?: string };
          if (!cancelled && r.ok && data.vendor) {
            setProfile(data.vendor);
            setOpeningHoursText(JSON.stringify(data.vendor.opening_hours ?? {}, null, 2));
          } else if (!cancelled) setMsg(data.error ?? "تعذر تحميل بيانات المتجر.");
        } catch {
          if (!cancelled) setMsg("تعذر الاتصال بالخادم.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [activeVendorId]);

  async function uploadAsset(
    kind: "logo" | "banner",
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeVendorId) return;
    setUploadKind(kind);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const r = await fetch(withVendorQuery("/api/vendor/upload-asset"), {
        method: "POST",
        body: fd,
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) {
        setMsg(j.error ?? "فشل رفع الملف.");
        return;
      }
      const patch =
        kind === "logo" ? { logoUrl: j.url } : { bannerUrl: j.url };
      const pr = await fetch(withVendorQuery("/api/vendor/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const pj = (await pr.json()) as { vendor?: VendorProfile; error?: string };
      if (!pr.ok || !pj.vendor) {
        setMsg(pj.error ?? "رُفع الملف لكن فشل حفظ الرابط في المتجر.");
        return;
      }
      setProfile(pj.vendor);
      setOpeningHoursText(JSON.stringify(pj.vendor.opening_hours ?? {}, null, 2));
      setMsg(kind === "logo" ? "تم رفع الشعار وحفظ الرابط." : "تم رفع البانر وحفظ الرابط.");
    } finally {
      setUploadKind(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    try {
      const openingHours = JSON.parse(openingHoursText) as Record<string, string>;
      const r = await fetch(withVendorQuery("/api/vendor/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          description: profile.description ?? "",
          logoUrl: profile.logo_url ?? "",
          bannerUrl: profile.banner_url ?? "",
          defaultPrepMinutes: profile.default_prep_minutes,
          minOrderShekel: agorotToShekel(profile.min_order_amount),
          deliveryFeeShekel: agorotToShekel(profile.delivery_fee_base),
          deliveryFeePerKmShekel: agorotToShekel(profile.delivery_fee_per_km ?? 0),
          isOpen: profile.is_open,
          addressText: profile.address_text ?? "",
          locationLat: profile.location_lat ?? null,
          locationLng: profile.location_lng ?? null,
          openingHours,
        }),
      });
      const data = (await r.json()) as { vendor?: VendorProfile; error?: string };
      if (!r.ok || !data.vendor) {
        setMsg(data.error ?? "فشل حفظ الإعدادات.");
        return;
      }
      setProfile(data.vendor);
      setOpeningHoursText(JSON.stringify(data.vendor.opening_hours ?? {}, null, 2));
      setMsg("تم حفظ إعدادات المتجر.");
    } catch {
      setMsg("صيغة ساعات العمل غير صالحة (JSON).");
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading || loading) {
    return <div className="rounded-3xl bg-white p-8 text-sm text-neutral-500 ring-1 ring-black/5">جارٍ التحميل…</div>;
  }

  if (error || !activeVendorId || !profile) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-8 text-sm text-neutral-600 ring-1 ring-black/5">
          لا يوجد متجر نشط. يمكنك طلب إضافة متجر جديد بالأسفل.
        </div>
        <RequestNewStoreSection />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      {msg && <p className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{msg}</p>}
      <Field label="اسم المتجر">
        <input className="input" value={profile.name} onChange={(e) => setProfile((s) => (s ? { ...s, name: e.target.value } : s))} />
      </Field>
      <Field label="وصف المتجر">
        <textarea className="input" rows={3} value={profile.description ?? ""} onChange={(e) => setProfile((s) => (s ? { ...s, description: e.target.value } : s))} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Field label="رابط الشعار">
            <input className="input" value={profile.logo_url ?? ""} onChange={(e) => setProfile((s) => (s ? { ...s, logo_url: e.target.value } : s))} />
          </Field>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="vendor-logo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={Boolean(uploadKind)}
              onChange={(e) => void uploadAsset("logo", e)}
            />
            <label
              htmlFor="vendor-logo-file"
              className="cursor-pointer rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              {uploadKind === "logo" ? "جارٍ الرفع…" : "رفع صورة شعار"}
            </label>
          </div>
        </div>
        <div>
          <Field label="رابط البانر">
            <input className="input" value={profile.banner_url ?? ""} onChange={(e) => setProfile((s) => (s ? { ...s, banner_url: e.target.value } : s))} />
          </Field>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="vendor-banner-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={Boolean(uploadKind)}
              onChange={(e) => void uploadAsset("banner", e)}
            />
            <label
              htmlFor="vendor-banner-file"
              className="cursor-pointer rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              {uploadKind === "banner" ? "جارٍ الرفع…" : "رفع صورة بانر"}
            </label>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="حد أدنى للطلب (شيكل)">
          <input className="input" type="number" step="0.01" min={0} value={agorotToShekel(profile.min_order_amount)} onChange={(e) => setProfile((s) => (s ? { ...s, min_order_amount: Math.round(Number(e.target.value || 0) * 100) } : s))} />
        </Field>
        <Field label="وقت التحضير الافتراضي (دقيقة)">
          <input className="input" type="number" min={1} value={profile.default_prep_minutes} onChange={(e) => setProfile((s) => (s ? { ...s, default_prep_minutes: Math.max(1, Number(e.target.value || 1)) } : s))} />
        </Field>
        <Field label="رسوم التوصيل الأساسية (شيكل)">
          <input className="input" type="number" step="0.01" min={0} value={agorotToShekel(profile.delivery_fee_base)} onChange={(e) => setProfile((s) => (s ? { ...s, delivery_fee_base: Math.round(Number(e.target.value || 0) * 100) } : s))} />
        </Field>
        <Field label="رسوم لكل كم (شيكل)">
          <input className="input" type="number" step="0.01" min={0} value={agorotToShekel(profile.delivery_fee_per_km ?? 0)} onChange={(e) => setProfile((s) => (s ? { ...s, delivery_fee_per_km: Math.round(Number(e.target.value || 0) * 100) } : s))} />
        </Field>
      </div>

      <div className="rounded-2xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
        <label className="flex items-center justify-between gap-2 text-sm font-bold text-emerald-900">
          <span>المتجر مفتوح حالياً</span>
          <input
            type="checkbox"
            className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-rose-300 transition-colors checked:bg-emerald-500 relative before:absolute before:start-1 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
            checked={profile.is_open ?? true}
            onChange={(e) => setProfile((s) => (s ? { ...s, is_open: e.target.checked } : s))}
          />
        </label>
        <p className="mt-1 text-[11px] text-emerald-800/80">
          أوقفه يدوياً إذا أردت إيقاف استقبال الطلبات (ساعات العمل تبقى ساريّة).
        </p>
      </div>

      <Field label="عنوان المتجر">
        <input
          className="input"
          value={profile.address_text ?? ""}
          onChange={(e) => setProfile((s) => (s ? { ...s, address_text: e.target.value } : s))}
          placeholder="المدينة، الحي، الشارع…"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="خط العرض (lat)">
          <input
            className="input"
            type="number"
            step="0.0000001"
            value={profile.location_lat ?? ""}
            onChange={(e) =>
              setProfile((s) => (s ? { ...s, location_lat: e.target.value === "" ? null : Number(e.target.value) } : s))
            }
          />
        </Field>
        <Field label="خط الطول (lng)">
          <input
            className="input"
            type="number"
            step="0.0000001"
            value={profile.location_lng ?? ""}
            onChange={(e) =>
              setProfile((s) => (s ? { ...s, location_lng: e.target.value === "" ? null : Number(e.target.value) } : s))
            }
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) {
                setMsg("المتصفح لا يدعم تحديد الموقع.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  setProfile((s) =>
                    s
                      ? {
                          ...s,
                          location_lat: pos.coords.latitude,
                          location_lng: pos.coords.longitude,
                        }
                      : s,
                  ),
                () => setMsg("تعذر الحصول على الموقع."),
              );
            }}
            className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-200"
          >
            استخدام موقعي الحالي
          </button>
        </div>
      </div>
      <Field label="ساعات العمل (JSON)">
        <textarea className="input font-mono text-xs" rows={6} value={openingHoursText} onChange={(e) => setOpeningHoursText(e.target.value)} />
      </Field>
      <button disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60">
        {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </button>
      <style>{`.input{display:block;width:100%;border-radius:1rem;background:#fff;padding:0.7rem 0.9rem;font-size:.9rem;box-shadow:0 0 0 1px rgba(0,0,0,.08);outline:none}.input:focus{box-shadow:0 0 0 2px rgba(16,185,129,.35)}`}</style>
    </form>

    {/* Request to add a new store */}
    <RequestNewStoreSection />
    </div>
  );
}

function RequestNewStoreSection() {
  const { vendors } = useVendorWorkspace();
  const [showForm, setShowForm] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorName.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const r = await fetch("/api/onboarding-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedRole: "vendor_staff",
          fullName: null,
          phone: null,
          vendorName: vendorName.trim(),
          note: note.trim() || null,
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "فشل الإرسال.");
      setResult("تم إرسال طلبك. سيراجعه المدير ويُفعّل المتجر عند الموافقة.");
      setVendorName("");
      setNote("");
      setShowForm(false);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "خطأ غير معروف.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-neutral-900">طلب إضافة متجر جديد</p>
          <p className="text-[12px] text-neutral-500">
            {vendors.length === 0
              ? "لا تملك أي متجر بعد. أرسل طلباً لإضافة متجرك إلى المنصة."
              : "يمكنك طلب إضافة متجر آخر إلى حسابك."}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shrink-0"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            طلب متجر
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-black/5 pt-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-neutral-600">اسم المتجر *</span>
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
              className="input"
              placeholder="مثال: متجر العطارة"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-neutral-600">ملاحظة (اختياري)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
              rows={2}
              placeholder="أي معلومات إضافية للمدير..."
            />
          </label>
          {result && (
            <p className={`rounded-xl px-3 py-2 text-sm ${result.includes("تم") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
              {result}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending || !vendorName.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {sending ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setResult(null); }}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-neutral-700"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
