import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseSessionFromRequest } from "@/lib/firebase/session";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

// T2.2: لا ثقة بكوكي fb_role. لمسارات اللوحات نعيد التحقق من profiles.role
// من Supabase (service-role) — الكوكي للعرض فقط. fail-closed عند تعذّر التحقق.
async function resolveRole(
  profileId: string,
  cookieRole: string | undefined,
): Promise<string | null> {
  if (!isSupabaseServerConfigured) return cookieRole ?? null; // demo/local فقط
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle();
    return data?.role ?? null;
  } catch {
    return null; // fail-closed: تعذّر التحقق ⇒ لا صلاحية
  }
}

export async function updateSession(request: NextRequest) {
  const session = getFirebaseSessionFromRequest(request);

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isVendorPath = path.startsWith("/vendor");
  const isDriverPath = path.startsWith("/driver");
  const isLoginPath = path === "/login";
  const isProtected = isAdminPath || isVendorPath || isDriverPath;

  if (isProtected && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  // الدور الموثوق = من DB (لا من الكوكي). يُحسب فقط عند الحاجة (مسار لوحة/login).
  const role =
    session && (isProtected || isLoginPath)
      ? await resolveRole(session.profileId, session.role)
      : session?.role ?? null;

  const isPlatformAdmin = role === "platform_admin";
  const isDriver = role === "driver";
  // البائع: profiles.role = vendor_staff (العزل الفعلي للمتجر في طبقة API).
  const hasVendorStaff = role === "vendor_staff" || role === "platform_admin";

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
