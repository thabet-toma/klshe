import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { log } from "@/lib/log";
import { sendOrderStatusPush } from "@/lib/push/web-push";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createRouteHandlerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  let body: { reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, customer_id, status, claimed_by")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  if (order.status === "dispatched" || order.status === "on_way" || order.status === "delivered") {
    return NextResponse.json({ error: "لا يمكن إلغاء الطلب بعد إرساله." }, { status: 409 });
  }
  if (order.status === "cancelled" || order.status === "rejected") {
    return NextResponse.json({ error: "الطلب ملغى بالفعل." }, { status: 409 });
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancellation_reason: body.reason?.trim() || null })
    .eq("id", id)
    .eq("customer_id", user.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  log.info("order_cancelled", { order_id: id, reason: body.reason });
  await sendOrderStatusPush(id, "cancelled");

  return NextResponse.json({ ok: true });
}
