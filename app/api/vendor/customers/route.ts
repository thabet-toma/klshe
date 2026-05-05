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
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) return NextResponse.json({ error: "متجر غير صالح." }, { status: 400 });

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) return NextResponse.json({ customers: [] });
    return svcErr;
  }
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { data, error } = await supabase
    .from("vendor_customers")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data ?? [] });
}

export async function POST(request: Request) {
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
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "اسم الزبون مطلوب." }, { status: 400 });

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { data, error } = await supabase
    .from("vendor_customers")
    .insert({
      vendor_id: vendorId,
      name,
      phone: body.phone?.trim() || null,
      note: body.note?.trim() || null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data }, { status: 201 });
}
