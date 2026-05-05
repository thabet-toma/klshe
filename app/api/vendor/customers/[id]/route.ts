import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
} from "@/lib/auth/require-vendor-staff";

export async function GET(
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

  const { data: customer, error: cErr } = await supabase
    .from("vendor_customers")
    .select("*")
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!customer) return NextResponse.json({ error: "غير موجود." }, { status: 404 });

  const { data: tx } = await supabase
    .from("vendor_customer_transactions")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ customer, transactions: tx ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) return NextResponse.json({ error: "متجر غير صالح." }, { status: 400 });

  let body: { type?: "debt" | "payment"; amount?: number; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }
  if (body.type !== "debt" && body.type !== "payment") {
    return NextResponse.json({ error: "type غير صالح." }, { status: 400 });
  }
  const amount = Math.round(Number(body.amount ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount غير صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  // Verify ownership
  const { data: c } = await supabase
    .from("vendor_customers")
    .select("id")
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: "غير موجود." }, { status: 404 });

  const { data, error } = await supabase
    .from("vendor_customer_transactions")
    .insert({
      customer_id: id,
      type: body.type,
      amount,
      note: body.note?.trim() || null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: data }, { status: 201 });
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
    .from("vendor_customers")
    .delete()
    .eq("id", id)
    .eq("vendor_id", vendorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
