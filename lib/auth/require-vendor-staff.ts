import { NextResponse } from "next/server";
import { getFirebaseSession } from "@/lib/firebase/session";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";

export async function requireVendorAccess(): Promise<{
  error: NextResponse | null;
  userId: string | null;
  vendorIds: string[];
}> {
  const session = await getFirebaseSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 }),
      userId: null,
      vendorIds: [],
    };
  }

  if (!isSupabaseServerConfigured) {
    return {
      error: NextResponse.json({ error: "خادم Supabase غير مهيأ." }, { status: 503 }),
      userId: null,
      vendorIds: [],
    };
  }

  const supabase = createServerSupabase();
  const { data: rows, error: staffError } = await supabase
    .from("vendor_staff")
    .select("vendor_id")
    .eq("profile_id", session.profileId);

  if (staffError) {
    return {
      error: NextResponse.json(
        { error: "تعذر قراءة بيانات المتجر. نفّذ migration_003_vendor_portal_rls.sql في Supabase." },
        { status: 500 },
      ),
      userId: null,
      vendorIds: [],
    };
  }

  const vendorIds = [...new Set((rows ?? []).map((r) => r.vendor_id))];

  if (vendorIds.length === 0) {
    return {
      error: NextResponse.json({ error: "لا يوجد ربط لهذا الحساب بأي متجر." }, { status: 403 }),
      userId: null,
      vendorIds: [],
    };
  }

  return { error: null, userId: session.uid, vendorIds };
}

export function skipVendorAuthBecauseDemo(): boolean {
  return process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
}

export type VendorApiContext = {
  denied: NextResponse | null;
  vendorIds: string[];
  userId: string | null;
};

export async function assertVendorApi(): Promise<VendorApiContext> {
  if (skipVendorAuthBecauseDemo()) {
    return { denied: null, vendorIds: [DEFAULT_VENDOR_ID], userId: null };
  }
  const { error, userId, vendorIds } = await requireVendorAccess();
  if (error) return { denied: error, vendorIds: [], userId: null };
  return { denied: null, vendorIds, userId };
}

export function pickVendorId(vendorIds: string[], requested: string | null): string | null {
  if (vendorIds.length === 0) return null;
  if (requested && vendorIds.includes(requested)) return requested;
  return vendorIds[0];
}

export function getServiceSupabaseOrError(): {
  error: NextResponse | null;
  supabase: ReturnType<typeof createServerSupabase> | null;
} {
  if (!isSupabaseServerConfigured) {
    return {
      error: NextResponse.json({ error: "خادم Supabase غير مهيأ (المفتاح السري)." }, { status: 503 }),
      supabase: null,
    };
  }
  return { error: null, supabase: createServerSupabase() };
}
