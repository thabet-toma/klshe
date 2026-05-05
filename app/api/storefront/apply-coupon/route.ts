import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    key: `coupon:${ip}`,
    limit: 40,
    windowMs: 60_000,
    windowLabel: "1 m",
  });
  if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = await createRouteHandlerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }

  let body: { code?: string; subtotal?: number };
  try {
    body = (await request.json()) as { code?: string; subtotal?: number };
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const code = body.code?.trim();
  const subtotal = typeof body.subtotal === "number" ? Math.max(0, Math.round(body.subtotal)) : NaN;
  if (!code || !Number.isFinite(subtotal)) {
    return NextResponse.json({ error: "code و subtotal مطلوبان." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("apply_coupon", {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as { ok?: boolean; error?: string; code?: string; discount_amount?: number };
  if (!result?.ok) {
    return NextResponse.json({ ok: false, error: result?.error ?? "COUPON_INVALID" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    discountAmount: result.discount_amount ?? 0,
  });
}
