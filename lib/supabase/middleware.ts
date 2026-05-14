import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseSessionFromRequest } from "@/lib/firebase/session";

export async function updateSession(request: NextRequest) {
  const session = getFirebaseSessionFromRequest(request);

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isVendorPath = path.startsWith("/vendor");
  const isDriverPath = path.startsWith("/driver");
  const isLoginPath = path === "/login";

  const role = session?.role;
  const isPlatformAdmin = role === "platform_admin";
  const isDriver = role === "driver";

  // Check vendor_staff from Supabase is handled in API guards; middleware uses cookie role.
  const hasVendorStaff = role === "vendor_staff" || role === "platform_admin";

  if ((isAdminPath || isVendorPath || isDriverPath) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminPath && session && !isPlatformAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "forbidden");
    redirectUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isVendorPath && session && !hasVendorStaff) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "vendor_forbidden");
    redirectUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isDriverPath && session && !isDriver && !isPlatformAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "driver_forbidden");
    redirectUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPath && session) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/admin";
    if (safeNext.startsWith("/admin") && !isPlatformAdmin) return NextResponse.next({ request });
    if (safeNext.startsWith("/vendor") && !hasVendorStaff) return NextResponse.next({ request });
    if (safeNext.startsWith("/driver") && !isDriver && !isPlatformAdmin) return NextResponse.next({ request });
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  return NextResponse.next({ request });
}
