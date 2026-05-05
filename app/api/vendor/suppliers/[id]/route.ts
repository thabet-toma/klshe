import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
} from "@/lib/auth/require-vendor-staff";
import type { Database } from "@/lib/supabase/types";

type SupplierUpdate = Database["public"]["Tables"]["vendor_suppliers"]["Update"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) return NextResponse.json({ error: "متجر غير صالح." }, { status: 400 });

  let body: { name?: string; phone?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const patch: SupplierUpdate = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.phone === "string") patch.phone = body.phone.trim() || null;
  if (typeof body.note === "string") patch.note = body.note.trim() || null;

  const { data, error } = await supabase
    .from("vendor_suppliers")
    .update(patch)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplier: data });
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
  if (!vendorId) return NextResponse.json({ error: "متجر غير صالح." }, { status: 400 });

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { error } = await supabase
    .from("vendor_suppliers")
    .delete()
    .eq("id", id)
    .eq("vendor_id", vendorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
