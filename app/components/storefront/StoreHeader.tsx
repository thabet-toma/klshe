"use client";

import Link from "next/link";
import { Bell, ChevronDown, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/app/components/i18n/I18nProvider";

type StoredLocation = {
  label: string;
  lat?: number;
  lng?: number;
  setAt?: number;
};

const LOCATION_KEY = "jetek-location";

export default function StoreHeader() {
  const { messages } = useI18n();
  const [location, setLocation] = useState<StoredLocation | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LOCATION_KEY);
      if (raw) setLocation(JSON.parse(raw) as StoredLocation);
    } catch {
      /* ignore */
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<StoredLocation>).detail;
      if (detail) setLocation(detail);
    };
    window.addEventListener("jetek:location-changed", handler as EventListener);
    return () => window.removeEventListener("jetek:location-changed", handler as EventListener);
  }, []);

  const label = location?.label?.trim() || messages.header.addressesCta;

  return (
    <header className="sticky top-0 z-30 bg-brand-gradient pb-6 pt-[max(env(safe-area-inset-top),1rem)] text-white shadow-soft dark:shadow-none">
      <div className="mx-auto flex w-full max-w-screen-md items-center justify-between gap-3 px-4">
        <Link
          href="/addresses"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-start backdrop-blur-md transition-colors hover:bg-white/25 active:bg-white/30"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25">
            <MapPin className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-medium text-white/80">
              {messages.header.deliverTo}
            </span>
            <span className="flex items-center gap-1 truncate text-sm font-bold">
              <span className="truncate">{label}</span>
              <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            </span>
          </span>
        </Link>

        <Link
          href="/orders"
          aria-label={messages.header.notifications}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md transition-colors hover:bg-white/25 active:bg-white/30"
        >
          <Bell className="h-5 w-5" strokeWidth={2.2} />
          <span className="absolute end-2.5 top-2.5 inline-flex h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-orange-500" />
        </Link>
      </div>
    </header>
  );
}
