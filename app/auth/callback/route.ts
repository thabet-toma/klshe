import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const reqUrl = new URL(request.url);
  const baseOrigin = process.env.NEXT_PUBLIC_APP_URL || reqUrl.origin;
  const { searchParams } = reqUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/admin";
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/admin";
  }

  if (!url || !key || !code) {
    const fallback = new URL("/login", baseOrigin);
    fallback.searchParams.set("error", "auth");
    return NextResponse.redirect(fallback);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore */
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const fallback = new URL("/login", baseOrigin);
    fallback.searchParams.set("error", "auth");
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(new URL(next, baseOrigin));
}
