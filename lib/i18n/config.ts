export const SUPPORTED_LOCALES = ["ar", "he", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ar";

export function isSupportedLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: string): "rtl" | "ltr" {
  return locale === "ar" || locale === "he" ? "rtl" : "ltr";
}
