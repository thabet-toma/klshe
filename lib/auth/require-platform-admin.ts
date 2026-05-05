import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * يتحقق من جلسة المستخدم ودور platform_admin في جدول profiles.
 * يُستخدم مع مسارات /api/admin/* قبل استدعاء service role.
 */
export async function requirePlatformAdmin(): Promise<{
  error: NextResponse | null;
  userId: string | null;
}> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    return {
      error: NextResponse.json(
        { error: "لم يُضبط المفتاح العام لـ Supabase في البيئة." },
        { status: 503 },
      ),
      userId: null,
    };
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
          /* Server Component / غير قابل للكتابة */
        }
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 }),
      userId: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      error: NextResponse.json(
        {
          error:
            "تعذر قراءة الملف الشخصي. نفّذ migration_002_multi_vendor_auth.sql في Supabase.",
        },
        { status: 500 },
      ),
      userId: null,
    };
  }

  if (!profile || profile.role !== "platform_admin") {
    return {
      error: NextResponse.json({ error: "صلاحيات غير كافية." }, { status: 403 }),
      userId: null,
    };
  }

  return { error: null, userId: user.id };
}

/** إن لم يُضبط المفتاح العام، يُسمح بالوصول (وضع عرض تجريبي فقط). */
export function skipAdminAuthBecauseDemo(): boolean {
  return !getSupabaseUrl() || !getSupabasePublishableKey();
}

/** لمسارات /api/admin: إن وُجدت مفاتيح الجلسة فاشرط platform_admin. */
export async function assertAdminApi(): Promise<NextResponse | null> {
  if (skipAdminAuthBecauseDemo()) {
    return null;
  }
  const { error } = await requirePlatformAdmin();
  return error;
}
