import { NextResponse } from "next/server";
import { getFirebaseSession } from "@/lib/firebase/session";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function requirePlatformAdmin(): Promise<{
  error: NextResponse | null;
  userId: string | null;
}> {
  const session = await getFirebaseSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 }),
      userId: null,
    };
  }

  if (!isSupabaseServerConfigured) {
    return {
      error: NextResponse.json({ error: "خادم Supabase غير مهيأ." }, { status: 503 }),
      userId: null,
    };
  }

  // الدور يُقرأ من قاعدة البيانات لا من cookie fb_role (قابل للتلاعب).
  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.profileId)
    .maybeSingle();

  if (profile?.role !== "platform_admin") {
    return {
      error: NextResponse.json({ error: "صلاحيات غير كافية." }, { status: 403 }),
      userId: null,
    };
  }

  return { error: null, userId: session.uid };
}

export function skipAdminAuthBecauseDemo(): boolean {
  return !isFirebaseAdminConfigured;
}

export async function assertAdminApi(): Promise<NextResponse | null> {
  if (skipAdminAuthBecauseDemo()) return null;
  const { error } = await requirePlatformAdmin();
  return error;
}
