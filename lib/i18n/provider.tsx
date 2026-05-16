"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { locales, type Locale, rtlLocales } from "./config";

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "rtl" | "ltr";
};

const LocaleContext = createContext<LocaleContextType | null>(null);

let cachedMessages: Record<Locale, Record<string, unknown>> = {} as Record<Locale, Record<string, unknown>>;

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  if (cachedMessages[locale]) return cachedMessages[locale];
  const mod = await import(`../../messages/${locale}.json`);
  cachedMessages[locale] = mod.default;
  return mod.default;
}

export function LocaleProvider({ children, initialLocale = "ar" }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Record<string, unknown>>({});

  useEffect(() => {
    void loadMessages(locale).then(setMessages);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { document.cookie = `locale=${l};path=/;max-age=31536000`; } catch {}
  }, []);

  const dir = rtlLocales.has(locale) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export { locales, type Locale };
