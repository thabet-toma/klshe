import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";

/**
 * جلسة المستخدم + جدول vendor_staff (بعد تفعيل RLS في migration_003).
 */
export async function requireVendorAccess(): Promise<{
  error: NextResponse | null;
  userId: string | null;
  vendorIds: string[];
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
      vendorIds: [],
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
          /* ignore */
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
      vendorIds: [],
    };
  }

  const { data: rows, error: staffError } = await supabase
    .from("vendor_staff")
    .select("vendor_id")
    .eq("profile_id", user.id);

  if (staffError) {
    return {
      error: NextResponse.json(
        {
          error:
            "تعذر قراءة بيانات المتجر. نفّذ migration_003_vendor_portal_rls.sql في Supabase.",
        },
        { status: 500 },
      ),
      userId: null,
      vendorIds: [],
    };
  }

  const vendorIds = [...new Set((rows ?? []).map((r) => r.vendor_id))];

  if (vendorIds.length === 0) {
    return {
      error: NextResponse.json(
        { error: "لا يوجد ربط لهذا الحساب بأي متجر." },
        { status: 403 },
      ),
      userId: null,
      vendorIds: [],
    };
  }

  return { error: null, userId: user.id, vendorIds };
}

export function skipVendorAuthBecauseDemo(): boolean {
  return !getSupabaseUrl() || !getSupabasePublishableKey();
}

export type VendorApiContext = {
  denied: NextResponse | null;
  vendorIds: string[];
  userId: string | null;
};

/**
 * لمسارات /api/vendor/* : إن وُجدت المفاتيح نتحقق من vendor_staff؛ وإلا نستخدم المتجر الافتراضي (عرض تجريبي).
 */
export async function assertVendorApi(): Promise<VendorApiContext> {
  if (skipVendorAuthBecauseDemo()) {
    return {
      denied: null,
      vendorIds: [DEFAULT_VENDOR_ID],
      userId: null,
    };
  }

  const { error, userId, vendorIds } = await requireVendorAccess();
  if (error) {
    return { denied: error, vendorIds: [], userId: null };
  }
  return { denied: null, vendorIds, userId };
}

/**
 * يختار vendor_id من الطلب إن وُجد وكان ضمن الصلاحيات، وإلا أول متجر.
 */
export function pickVendorId(
  vendorIds: string[],
  requested: string | null,
): string | null {
  if (vendorIds.length === 0) return null;
  if (
    requested &&
    vendorIds.includes(requested)
  ) {
    return requested;
  }
  return vendorIds[0];
}

/**
 * تحقق خدمي (مفتاح سري): لقراءة الطلبات/المنتجات مفلترة حسب المتجر دون الاعتماد على RLS على الجداول الحالية.
 */
export function getServiceSupabaseOrError(): {
  error: NextResponse | null;
  supabase: ReturnType<typeof createServerSupabase> | null;
} {
  if (!isSupabaseServerConfigured) {
    return {
      error: NextResponse.json(
        { error: "خادم Supabase غير مهيأ (المفتاح السري)." },
        { status: 503 },
      ),
      supabase: null,
    };
  }
  return { error: null, supabase: createServerSupabase() };
}
