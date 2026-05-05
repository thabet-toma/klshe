import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
} from "@/lib/auth/require-vendor-staff";
import type { Database } from "@/lib/supabase/types";

type InventoryUpdate = Database["public"]["Tables"]["vendor_inventory"]["Update"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  let body: {
    stock?: number;
    minStock?: number;
    costPrice?: number;
    unit?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const patch: InventoryUpdate = { updated_at: new Date().toISOString() };
  if (typeof body.stock === "number") patch.stock = body.stock;
  if (typeof body.minStock === "number") patch.min_stock = body.minStock;
  if (typeof body.costPrice === "number") patch.cost_price = Math.round(body.costPrice);
  if (typeof body.unit === "string") patch.unit = body.unit;

  const { data, error } = await supabase
    .from("vendor_inventory")
    .update(patch)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { error } = await supabase
    .from("vendor_inventory")
    .delete()
    .eq("id", id)
    .eq("vendor_id", vendorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
