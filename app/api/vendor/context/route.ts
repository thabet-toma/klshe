import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";

export async function GET(request: Request) {
  const { denied, vendorIds, userId } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const requestedVendor = searchParams.get("vendorId");
  const activeVendorId = pickVendorId(vendorIds, requestedVendor);
  if (!activeVendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({
        vendors: [
          {
            id: DEFAULT_VENDOR_ID,
            slug: "jetek-main",
            name: "جيتك — المتجر الرئيسي",
            isActive: true,
            staffRole: "owner",
          },
        ],
        activeVendorId: activeVendorId ?? DEFAULT_VENDOR_ID,
      });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "خادم غير مهيأ." },
      { status: 503 },
    );
  }

  const { data: vendors, error: vErr } = await supabase
    .from("vendors")
    .select("id, slug, name, is_active")
    .in("id", vendorIds)
    .order("name", { ascending: true });

  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 500 });
  }

  let staffRows: { vendor_id: string; staff_role: string }[] = [];
  if (userId) {
    const { data } = await supabase
      .from("vendor_staff")
      .select("vendor_id, staff_role")
      .eq("profile_id", userId)
      .in("vendor_id", vendorIds);
    staffRows = data ?? [];
  } else {
    staffRows = vendorIds.map((vid) => ({
      vendor_id: vid,
      staff_role: "owner",
    }));
  }

  const roleByVendor = new Map(staffRows.map((r) => [r.vendor_id, r.staff_role]));

  return NextResponse.json({
    vendors: (vendors ?? []).map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      isActive: v.is_active,
      staffRole: roleByVendor.get(v.id) ?? null,
    })),
    activeVendorId,
  });
}
