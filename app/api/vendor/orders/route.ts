import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";

export async function GET(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const requestedVendor = searchParams.get("vendorId");
  const vendorId = pickVendorId(vendorIds, requestedVendor);
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({ orders: [] });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      short_code,
      customer_name,
      customer_phone,
      customer_address,
      subtotal,
      delivery_fee,
      total,
      status,
      payment_method,
      notes,
      created_at,
      accepted_at,
      ready_at,
      cancellation_reason,
      vendor_id,
      order_items (
        id,
        product_id,
        product_name,
        unit_price,
        quantity,
        line_total
      )
    `,
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
