import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isPlatformAdmin = false;
  let hasVendorStaff = false;
  let isDriver = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isPlatformAdmin = profile?.role === "platform_admin";
    isDriver = profile?.role === "driver";

    const { data: staffRow } = await supabase
      .from("vendor_staff")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    hasVendorStaff = Boolean(staffRow);

    if (!isDriver) {
      const { data: driverRow } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      isDriver = Boolean(driverRow);
    }
  }

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin");
  const isVendorPath = path.startsWith("/vendor");
  const isDriverPath = path.startsWith("/driver");
  const isLoginPath = path === "/login";

  if (isAdminPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminPath && user && !isPlatformAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "forbidden");
    redirectUrl.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isVendorPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isVendorPath && user && !hasVendorStaff) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "vendor_forbidden");
    redirectUrl.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isDriverPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isDriverPath && user && !isDriver) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "driver_forbidden");
    redirectUrl.searchParams.set(
      "next",
      `${path}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPath && user) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/admin";
    if (safeNext.startsWith("/admin") && !isPlatformAdmin) {
      return supabaseResponse;
    }
    if (safeNext.startsWith("/vendor") && !hasVendorStaff) {
      return supabaseResponse;
    }
    if (safeNext.startsWith("/driver") && !isDriver) {
      return supabaseResponse;
    }
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  return supabaseResponse;
}
