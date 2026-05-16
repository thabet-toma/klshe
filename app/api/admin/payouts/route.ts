import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function GET(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ payouts: [], vendors: [] });
  }

  const supabase = createServerSupabase();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let q = supabase
    .from("payouts")
    .select("id, vendor_id, amount, status, requested_at, approved_at, paid_at, note")
    .order("requested_at", { ascending: false })
    .limit(100);

  if (status && ["requested", "approved", "paid", "rejected", "cancelled"].includes(status)) q = q.eq("status", status as "requested");

  const [{ data: payouts, error }, { data: vendors }] = await Promise.all([
    q,
    supabase.from("vendors").select("id, name, slug"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payouts: payouts ?? [], vendors: vendors ?? [] });
}

export async function PATCH(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  let body: { payoutId?: string; action?: "approve" | "reject" | "mark_paid"; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const payoutId = body.payoutId?.trim();
  if (!payoutId) return NextResponse.json({ error: "payoutId مطلوب." }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: payout } = await supabase
    .from("payouts")
    .select("id, vendor_id, amount, status")
    .eq("id", payoutId)
    .maybeSingle();

  if (!payout) return NextResponse.json({ error: "الدفعة غير موجودة." }, { status: 404 });
  if (payout.status !== "requested") {
    return NextResponse.json({ error: "لا يمكن تعديل دفعة غير معلّقة." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const patch: { status?: "approved" | "rejected" | "paid"; approved_at?: string; paid_at?: string; note?: string } = {};

  if (body.action === "approve") {
    patch.status = "approved";
    patch.approved_at = now;
  } else if (body.action === "reject") {
    patch.status = "rejected";
    patch.approved_at = now;
  } else if (body.action === "mark_paid") {
    patch.status = "paid";
    patch.paid_at = now;
  } else {
    return NextResponse.json({ error: "إجراء غير صالح." }, { status: 400 });
  }

  if (body.note) patch.note = body.note;

  const { data, error } = await supabase
    .from("payouts")
    .update(patch)
    .eq("id", payoutId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  log.info("admin_payout_action", { payout_id: payoutId, action: body.action, vendor_id: payout.vendor_id });

  return NextResponse.json({ payout: data });
}
