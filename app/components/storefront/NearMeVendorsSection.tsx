"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import VendorCard from "@/app/components/storefront/VendorCard";
import SectionHeader from "@/app/components/storefront/SectionHeader";
import type { VendorSummary } from "@/lib/supabase/storefront";
import {
  readStoredLocation,
  reverseGeocode,
  writeStoredLocation,
} from "@/lib/geo/reverse-geocode";

type Status = "prompt" | "loading" | "done" | "denied" | "error";

export default function NearMeVendorsSection() {
  const [status, setStatus] = useState<Status>("prompt");
  const [msg, setMsg] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    try {
      const r = await fetch(
        `/api/storefront/nearby-vendors?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&limit=8`,
        { cache: "no-store" },
      );
      const data = (await r.json()) as {
        vendors?: VendorSummary[];
        error?: string;
      };
      if (!r.ok) {
        setStatus("error");
        setMsg(data.error ?? "تعذر جلب المتاجر القريبة.");
        setVendors([]);
        return;
      }
      setVendors(data.vendors ?? []);
      setStatus("done");
    } catch {
      setStatus("error");
      setMsg("خطأ في الشبكة.");
      setVendors([]);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMsg("المتصفح/الجهاز لا يدعم تحديد الموقع.");
      return;
    }
    setStatus("loading");
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = await reverseGeocode(latitude, longitude);
        writeStoredLocation({
          label: result?.label ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
        });
        await fetchNearby(latitude, longitude);
      },
      (err) => {
        setStatus("denied");
        setMsg(
          err.code === err.PERMISSION_DENIED
            ? "تم رفض الإذن. فعّل صلاحية الموقع من إعدادات التطبيق/المتصفح."
            : "تعذر تحديد موقعك. تأكد من تفعيل GPS وأعد المحاولة.",
        );
        setVendors([]);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 },
    );
  }, [fetchNearby]);

  useEffect(() => {
    const stored = readStoredLocation();
    if (
      stored &&
      typeof stored.lat === "number" &&
      typeof stored.lng === "number"
    ) {
      setStatus("loading");
      void fetchNearby(stored.lat, stored.lng);
    }
  }, [fetchNearby]);

  if (status === "prompt") {
    return (
      <section className="mt-8">
        <SectionHeader
          title="متاجر قريبة منك"
          subtitle="فعّل الموقع لرؤية المتاجر الأقرب إليك"
        />
        <div className="mx-auto flex w-full max-w-screen-md flex-col items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => requestLocation()}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop"
          >
            <MapPin className="h-4 w-4" strokeWidth={2.4} />
            تفعيل تحديد الموقع
          </button>
        </div>
      </section>
    );
  }

  if (status === "denied") {
    return (
      <section className="mt-8">
        <SectionHeader title="متاجر قريبة منك" subtitle={msg ?? ""} />
        <div className="mx-auto flex justify-center px-4">
          <button
            type="button"
            onClick={() => requestLocation()}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
            حاول من جديد
          </button>
        </div>
      </section>
    );
  }

  if (status === "loading" && vendors.length === 0) {
    return (
      <section className="mt-8">
        <SectionHeader title="متاجر قريبة منك" subtitle="جارٍ تحديد الموقع…" />
        <div className="mx-auto w-full max-w-screen-md px-4">
          <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="mt-8">
        <SectionHeader title="متاجر قريبة منك" subtitle={msg ?? "حدث خطأ"} />
        <div className="mx-auto flex justify-center px-4">
          <button
            type="button"
            onClick={() => requestLocation()}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-800"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
            إعادة المحاولة
          </button>
        </div>
      </section>
    );
  }

  if (status === "done" && vendors.length === 0) {
    return (
      <section className="mt-8">
        <SectionHeader
          title="متاجر قريبة منك"
          subtitle="لا توجد متاجر قريبة بإحداثيات مسجّلة في منطقتك حالياً."
        />
      </section>
    );
  }

  if (vendors.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mx-auto mb-3 flex w-full max-w-screen-md items-end justify-between px-4">
        <div>
          <h2 className="text-base font-extrabold text-neutral-900">
            متاجر قريبة منك
          </h2>
          <p className="text-[12px] text-neutral-500">
            مرتبة حسب المسافة التقريبية
          </p>
        </div>
        <button
          type="button"
          onClick={() => requestLocation()}
          className="text-sm font-bold text-brand-600 hover:text-brand-700"
        >
          تحديث الموقع
        </button>
      </div>
      <div className="mx-auto grid w-full max-w-screen-md grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4">
        {vendors.map((v) => (
          <VendorCard key={v.id} vendor={v} />
        ))}
      </div>
    </section>
  );
}
