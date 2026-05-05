import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/app/components/i18n/I18nProvider";
import PostHogProvider from "@/app/components/analytics/PostHogProvider";
import { DEFAULT_LOCALE, isSupportedLocale, localeDir } from "@/lib/i18n/config";
import { messagesByLocale } from "@/lib/i18n/messages";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "جيتك | توصيل سريع",
  description:
    "اطلب من المطاعم والبقالة والمزيد — توصيل لإسرائيل وفلسطين بضغطة واحدة.",
  applicationName: "جيتك",
  keywords: [
    "توصيل",
    "متجر",
    "طلبات",
    "جيتك",
    "Jetek",
    "شيكل",
    "فلسطين",
    "إسرائيل",
  ],
  authors: [{ name: "Jetek" }],
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#FF5A1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value ?? DEFAULT_LOCALE;
  const locale = isSupportedLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const dir = localeDir(locale);
  const messages = messagesByLocale[locale];

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900 selection:bg-orange-200 selection:text-orange-900 dark:bg-neutral-950 dark:text-neutral-100">
        <I18nProvider locale={locale} messages={messages}>
          <PostHogProvider>{children}</PostHogProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
