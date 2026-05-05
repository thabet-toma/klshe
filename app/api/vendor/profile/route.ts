import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import { shekelToAgorot } from "@/lib/currency/agorot";
import type { Database } from "@/lib/supabase/types";

type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];

export async function GET(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({
        vendor: {
          id: vendorId,
          name: "جيتك — المتجر الرئيسي",
          description: "متجر تجريبي",
          logo_url: "/logo.svg",
          banner_url: "/logo.svg",
          min_order_amount: 0,
          delivery_fee_base: 0,
          default_prep_minutes: 30,
          opening_hours: {},
        },
      });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("vendors")
    .select(
      "id, name, description, logo_url, banner_url, min_order_amount, delivery_fee_base, delivery_fee_per_km, default_prep_minutes, opening_hours, is_open, address_text, location_lat, location_lng",
    )
    .eq("id", vendorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "المتجر غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ vendor: data });
}

export async function PATCH(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const patch: VendorUpdate = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.logoUrl === "string") patch.logo_url = body.logoUrl.trim();
  if (typeof body.bannerUrl === "string") patch.banner_url = body.bannerUrl.trim();
  if (typeof body.defaultPrepMinutes === "number") {
    patch.default_prep_minutes = Math.max(1, Math.round(body.defaultPrepMinutes));
  }
  if (typeof body.minOrderShekel === "number" && body.minOrderShekel >= 0) {
    patch.min_order_amount = shekelToAgorot(body.minOrderShekel);
  } else if (typeof body.minOrderAgorot === "number" && body.minOrderAgorot >= 0) {
    patch.min_order_amount = Math.round(body.minOrderAgorot);
  }
  if (typeof body.deliveryFeeShekel === "number" && body.deliveryFeeShekel >= 0) {
    patch.delivery_fee_base = shekelToAgorot(body.deliveryFeeShekel);
  } else if (
    typeof body.deliveryFeeAgorot === "number" &&
    body.deliveryFeeAgorot >= 0
  ) {
    patch.delivery_fee_base = Math.round(body.deliveryFeeAgorot);
  }
  if (body.openingHours && typeof body.openingHours === "object") {
    patch.opening_hours =
      body.openingHours as Database["public"]["Tables"]["vendors"]["Row"]["opening_hours"];
  }
  if (typeof body.isOpen === "boolean") {
    (patch as Record<string, unknown>).is_open = body.isOpen;
  }
  if (typeof body.deliveryFeePerKmShekel === "number" && body.deliveryFeePerKmShekel >= 0) {
    (patch as Record<string, unknown>).delivery_fee_per_km = shekelToAgorot(
      body.deliveryFeePerKmShekel,
    );
  }
  if (typeof body.addressText === "string") {
    (patch as Record<string, unknown>).address_text = body.addressText.trim();
  }
  if (typeof body.locationLat === "number") {
    (patch as Record<string, unknown>).location_lat = body.locationLat;
  }
  if (typeof body.locationLng === "number") {
    (patch as Record<string, unknown>).location_lng = body.locationLng;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", vendorId)
    .select(
      "id, name, description, logo_url, banner_url, min_order_amount, delivery_fee_base, delivery_fee_per_km, default_prep_minutes, opening_hours, is_open, address_text, location_lat, location_lng",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vendor: data });
}
