import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import { shekelToAgorot } from "@/lib/currency/agorot";
import { createPayoutSchema, type CreatePayoutInput } from "@/lib/schemas/payout";

export async function GET(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;
  const vendorId = pickVendorId(vendorIds, new URL(request.url).searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({
        balance: { available_amount: 0, pending_amount: 0, updated_at: new Date().toISOString() },
        payouts: [],
      });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const [{ data: balance }, { data: payouts, error: pErr }] = await Promise.all([
    supabase
      .from("vendor_balances")
      .select("available_amount, pending_amount, updated_at")
      .eq("vendor_id", vendorId)
      .maybeSingle(),
    supabase
      .from("payouts")
      .select("id, amount, status, requested_at, approved_at, paid_at, note")
      .eq("vendor_id", vendorId)
      .order("requested_at", { ascending: false })
      .limit(30),
  ]);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({
    balance: balance ?? { available_amount: 0, pending_amount: 0, updated_at: null },
    payouts: payouts ?? [],
  });
}

export async function POST(request: Request) {
  const { denied, vendorIds, userId } = await assertVendorApi();
  if (denied) return denied;
  const vendorId = pickVendorId(vendorIds, new URL(request.url).searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  let body: CreatePayoutInput;
  try {
    const raw = await request.json();
    const parsed = createPayoutSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const amount =
    typeof body.amountAgorot === "number" && body.amountAgorot > 0
      ? Math.round(body.amountAgorot)
      : typeof body.amountShekel === "number" && body.amountShekel > 0
        ? shekelToAgorot(body.amountShekel)
        : 0;
  if (amount <= 0) {
    return NextResponse.json({ error: "قيمة السحب غير صالحة." }, { status: 400 });
  }

  const { data: bal } = await supabase
    .from("vendor_balances")
    .select("available_amount")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if ((bal?.available_amount ?? 0) < amount) {
    return NextResponse.json({ error: "الرصيد المتاح لا يكفي للسحب." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payouts")
    .insert({
      vendor_id: vendorId,
      amount,
      status: "requested",
      requested_by: userId,
      note: body.note?.trim() || null,
    })
    .select("id, amount, status, requested_at, approved_at, paid_at, note")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payout: data }, { status: 201 });
}
