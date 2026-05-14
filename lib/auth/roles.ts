import { getFirebaseSession } from "@/lib/firebase/session";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

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
  if (!isSupabaseServerConfigured) return EMPTY;
  const session = await getFirebaseSession();
  if (!session) return EMPTY;

  const supabase = createServerSupabase();
  let isAdmin = false;
  let isVendor = false;
  let isDriver = false;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.profileId)
      .maybeSingle();
    if (profile?.role === "platform_admin") isAdmin = true;
    if (profile?.role === "driver") isDriver = true;
  } catch {
    /* ignore */
  }

  try {
    const { data: staff } = await supabase
      .from("vendor_staff")
      .select("vendor_id")
      .eq("profile_id", session.profileId)
      .limit(1);
    if (staff && staff.length > 0) isVendor = true;
  } catch {
    /* ignore */
  }

  return {
    authenticated: true,
    userId: session.profileId,
    email: session.email ?? null,
    isAdmin,
    isVendor,
    isDriver,
  };
}
