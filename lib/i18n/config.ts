export const DEFAULT_LOCALE = "ar" as const;
export const SUPPORTED_LOCALES = ["ar", "he", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(locale: string): locale is AppLocale {
  return SUPPORTED_LOCALES.includes(locale as AppLocale);
}

export function localeDir(locale: AppLocale): "rtl" | "ltr" {
  return locale === "en" ? "ltr" : "rtl";
}

export const locales = SUPPORTED_LOCALES;
export type Locale = AppLocale;

export const rtlLocales = new Set<AppLocale>(["ar", "he"]);
