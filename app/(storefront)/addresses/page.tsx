"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Crosshair, MapPin, Pencil, Trash2 } from "lucide-react";
import { reverseGeocode, writeStoredLocation } from "@/lib/geo/reverse-geocode";

type AddressRow = {
  id: string;
  label: string | null;
  line1: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
};

export default function AddressesPage() {
  const [rows, setRows] = useState<AddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  async function loadAddresses() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/account/addresses", { cache: "no-store" });
      const data = (await r.json()) as { error?: string; addresses?: AddressRow[] };
      if (!r.ok) {
        setError(data.error ?? "تعذر تحميل العناوين.");
        setRows([]);
        return;
      }
      setRows(data.addresses ?? []);
    } catch {
      setError("تعذر الاتصال بالخادم.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadAddresses();
    });
  }, []);

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setLine1("");
    setCity("");
    setLat("");
    setLng("");
    setIsDefault(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses";
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || null,
          line1: line1.trim(),
          city: city.trim() || null,
          lat: lat.trim() ? Number(lat) : null,
          lng: lng.trim() ? Number(lng) : null,
          isDefault,
        }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(data.error ?? "تعذر حفظ العنوان.");
        return;
      }
      if (isDefault && lat && lng) {
        writeStoredLocation({
          label: [city.trim(), label.trim()].filter(Boolean).join(" - ") || line1.trim(),
          lat: Number(lat),
          lng: Number(lng),
        });
      }
      resetForm();
      await loadAddresses();
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: string) {
    if (!window.confirm("حذف هذا العنوان؟")) return;
    const r = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (r.ok) await loadAddresses();
  }

  function editAddress(row: AddressRow) {
    setEditingId(row.id);
    setLabel(row.label ?? "");
    setLine1(row.line1);
    setCity(row.city ?? "");
    setLat(row.lat == null ? "" : String(row.lat));
    setLng(row.lng == null ? "" : String(row.lng));
    setIsDefault(row.is_default);
  }

  async function setAsDeliveryLocation(row: AddressRow) {
    if (row.lat == null || row.lng == null) return;
    writeStoredLocation({
      label: [row.city ?? "", row.label ?? ""].filter(Boolean).join(" - ") || row.line1,
      lat: row.lat,
      lng: row.lng,
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        const result = await reverseGeocode(latitude, longitude);
        if (result) {
          if (result.city && !city) setCity(result.city);
          if (!line1) setLine1(result.label);
        }
        setLocating(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "تم رفض إذن الموقع. فعّله من إعدادات التطبيق/المتصفح."
            : "تعذر الحصول على موقعك الحالي.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 pb-12 pt-2">
      <nav className="mb-4 flex items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="font-bold text-brand-600 hover:text-brand-700">
          الرئيسية
        </Link>
        <ChevronRight className="h-4 w-4 rotate-180 text-neutral-400" />
        <span className="font-extrabold text-neutral-800">عناوين التوصيل</span>
      </nav>

      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <h1 className="mb-3 text-lg font-extrabold text-neutral-900">
          {editingId ? "تعديل عنوان" : "إضافة عنوان جديد"}
        </h1>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="وصف العنوان (المنزل، العمل)"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="المدينة"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-100 disabled:opacity-50"
        >
          <Crosshair className="h-4 w-4" strokeWidth={2.4} />
          {locating ? "جارٍ تحديد موقعك…" : "استخدم موقعي الحالي"}
        </button>
        {lat.trim() && lng.trim() && (
          <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-black/10">
            <iframe
              title="معاينة موقع العنوان"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&z=15&output=embed`}
              loading="lazy"
              className="h-40 w-full border-0"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
        <textarea
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="العنوان التفصيلي (الشارع، رقم المبنى، علامة مميزة...)"
          rows={3}
          required
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
        />
        <label className="mt-2 flex items-center gap-2 text-sm font-bold text-neutral-700">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          تعيين كعنوان افتراضي للتوصيل
        </label>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "جار الحفظ..." : editingId ? "حفظ التعديل" : "إضافة العنوان"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-bold"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 ring-1 ring-black/5">
            جار تحميل العناوين...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <MapPin className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <p className="text-sm text-neutral-600">لا توجد عناوين بعد. أضف عنوانك الأول.</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-neutral-900">
                    {row.label || "عنوان"}
                    {row.is_default ? (
                      <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
                        افتراضي
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 truncate text-sm text-neutral-700">{row.line1}</p>
                  {row.city ? <p className="text-xs text-neutral-500">{row.city}</p> : null}
                  {row.lat != null && row.lng != null ? (
                    <button
                      type="button"
                      onClick={() => void setAsDeliveryLocation(row)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-extrabold text-brand-700"
                    >
                      <MapPin className="h-3 w-3" strokeWidth={2.6} />
                      اختر للتوصيل
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => editAddress(row)}
                    className="rounded-lg bg-neutral-100 p-2 text-neutral-700"
                    aria-label="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeAddress(row.id)}
                    className="rounded-lg bg-rose-50 p-2 text-rose-700"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
