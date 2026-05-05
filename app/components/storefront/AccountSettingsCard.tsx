"use client";

import { useEffect, useState } from "react";
import { Globe, Moon, Sun } from "lucide-react";
import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config";

const LOCALE_LABEL: Record<AppLocale, string> = {
  ar: "العربية",
  he: "עברית",
  en: "English",
};

export default function AccountSettingsCard() {
  const [dark, setDark] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("ar");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDark(window.localStorage.getItem("theme") === "dark");
    const cookie = window.document.cookie
      .split("; ")
      .find((v) => v.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];
    if (cookie === "ar" || cookie === "he" || cookie === "en") {
      setLocale(cookie);
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
  }

  function changeLocale(next: AppLocale) {
    setLocale(next);
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const path = window.location.pathname.replace(/^\/(ar|he|en)(?=\/|$)/, "") || "/";
    window.location.href = `/${next}${path === "/" ? "" : path}${window.location.search}`;
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <h2 className="mb-3 text-sm font-extrabold text-neutral-700">الإعدادات</h2>

      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5 transition-colors hover:bg-neutral-100"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
            {dark ? (
              <Sun className="h-4 w-4" strokeWidth={2.4} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={2.4} />
            )}
          </span>
          <span className="text-start">
            <span className="block text-sm font-extrabold text-neutral-900">
              الوضع الليلي
            </span>
            <span className="block text-[11px] text-neutral-500">
              {dark ? "مفعّل" : "غير مفعّل"}
            </span>
          </span>
        </span>
        <span
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            dark ? "bg-emerald-500" : "bg-neutral-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              dark ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </span>
      </button>

      <div className="mt-3 rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Globe className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-neutral-900">اللغة</p>
            <p className="text-[11px] text-neutral-500">
              تتغير اللغة فوراً مع الاتجاه
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => changeLocale(l)}
              className={`rounded-xl px-2 py-2 text-xs font-extrabold transition-colors ${
                locale === l
                  ? "bg-brand-gradient text-white shadow-pop"
                  : "bg-white text-neutral-700 ring-1 ring-black/5 hover:bg-neutral-100"
              }`}
            >
              {LOCALE_LABEL[l]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
