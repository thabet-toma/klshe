import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export type AppRole =
  | "customer"
  | "vendor_staff"
  | "platform_admin"
  | "driver";

export type CurrentUserRoles = {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  isVendor: boolean;
  isDriver: boolean;
};

const EMPTY: CurrentUserRoles = {
  authenticated: false,
  userId: null,
  email: null,
  isAdmin: false,
  isVendor: false,
  isDriver: false,
};

/**
 * Server-only helper: detects all roles for the currently authenticated user.
 * Used by layouts to gate role switcher visibility, and by guarded layouts
 * to redirect unauthorized users away from /admin /vendor /driver.
 */
export async function getCurrentUserRoles(): Promise<CurrentUserRoles> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return EMPTY;

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
          /* read-only context */
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  let isAdmin = false;
  let isVendor = false;
  let isDriver = false;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "platform_admin") isAdmin = true;
  } catch {
    /* ignore profile errors */
  }

  try {
    const { data: staff } = await supabase
      .from("vendor_staff")
      .select("vendor_id")
      .eq("profile_id", user.id)
      .limit(1);
    if (staff && staff.length > 0) isVendor = true;
  } catch {
    /* ignore */
  }

  try {
    const { data: driver } = await supabase
      .from("delivery_drivers")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1);
    if (driver && driver.length > 0) isDriver = true;
  } catch {
    /* ignore */
  }

  return {
    authenticated: true,
    userId: user.id,
    email: user.email ?? null,
    isAdmin,
    isVendor,
    isDriver,
  };
}
