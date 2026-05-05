import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n/config";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const parts = pathname.split("/").filter(Boolean);
  const maybeLocale = parts[0] ?? "";
  const hasLocalePrefix = isSupportedLocale(maybeLocale);
  const isStaticOrApi =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  // Keep panel/auth paths as-is (no locale prefix required)
  const strippedPath = hasLocalePrefix
    ? `/${parts.slice(1).join("/")}`.replace(/\/+$/, "") || "/"
    : pathname;
  const isBackofficePath =
    strippedPath.startsWith("/admin") ||
    strippedPath.startsWith("/vendor") ||
    strippedPath.startsWith("/driver") ||
    strippedPath.startsWith("/erp") ||
    strippedPath.startsWith("/login") ||
    strippedPath.startsWith("/signup");

  // Redirect storefront/public routes to locale-prefixed URLs.
  if (!hasLocalePrefix && !isStaticOrApi && !isBackofficePath) {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value ?? "";
    const preferredLocale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const target = request.nextUrl.clone();
    target.pathname = `/${preferredLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(target, 307);
  }

  // /ar/... -> internally resolve as /... while keeping URL locale-prefixed.
  if (hasLocalePrefix) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = strippedPath;
    const authResponse = await updateSession(request);
    const rewrittenResponse = NextResponse.rewrite(rewritten);

    // Preserve auth cookies from Supabase middleware.
    for (const c of authResponse.cookies.getAll()) {
      rewrittenResponse.cookies.set(c);
    }
    rewrittenResponse.cookies.set("NEXT_LOCALE", maybeLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return rewrittenResponse;
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * تمرير كل المسارات عدا الأصول الثابتة
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
