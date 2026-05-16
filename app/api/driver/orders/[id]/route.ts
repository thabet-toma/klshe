import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";
import { sendOrderStatusPush } from "@/lib/push/web-push";

type DriverAction = "pickup" | "start" | "arrived" | "delivered";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  const { data: driverRow } = await supabase
    .from("delivery_drivers")
    .select("id")
    .eq("user_id", identity.profileId)
    .maybeSingle();
  if (!driverRow?.id) {
    return NextResponse.json({ error: "حسابك ليس سائقاً معتمداً." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      short_code,
      status,
      customer_name,
      customer_phone,
      customer_address,
      location_lat,
      location_lng,
      subtotal,
      delivery_fee,
      total,
      payment_method,
      notes,
      created_at,
      picked_at,
      delivered_at,
      order_items (
        id,
        product_name,
        quantity,
        line_total
      )
    `,
    )
    .eq("id", id)
    .eq("driver_id", driverRow.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
  return NextResponse.json({ order: data, driverId: driverRow.id });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  const { data: driverRow } = await supabase
    .from("delivery_drivers")
    .select("id")
    .eq("user_id", identity.profileId)
    .maybeSingle();

  if (!driverRow?.id) {
    return NextResponse.json({ error: "حسابك ليس سائقاً معتمداً." }, { status: 403 });
  }

  const driverId = driverRow.id;
  if (!driverId) {
    return NextResponse.json({ error: "لا يوجد سجل سائق لهذا الحساب." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  let body: { action?: DriverAction };
  try {
    body = (await request.json()) as { action?: DriverAction };
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const action = body.action;
  if (!action || !["pickup", "start", "arrived", "delivered"].includes(action)) {
    return NextResponse.json(
      { error: "action يجب أن تكون pickup أو start أو arrived أو delivered." },
      { status: 400 },
    );
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status, driver_id, picked_at")
    .eq("id", id)
    .maybeSingle();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
  if (order.driver_id !== driverId) {
    return NextResponse.json({ error: "هذا الطلب ليس مخصصاً لك." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const patch: {
    status?: string;
    picked_at?: string;
    delivered_at?: string;
  } = {};

  if (action === "pickup") {
    if (!["ready", "dispatched"].includes(order.status)) {
      return NextResponse.json({ error: "لا يمكن الاستلام في هذه الحالة." }, { status: 409 });
    }
    patch.status = "dispatched";
    patch.picked_at = now;
  } else if (action === "start" || action === "arrived") {
    if (!["dispatched", "on_way"].includes(order.status)) {
      return NextResponse.json({ error: "لا يمكن بدء/متابعة التوصيل الآن." }, { status: 409 });
    }
    patch.status = "on_way";
    if (!order.picked_at) patch.picked_at = now;
  } else if (action === "delivered") {
    if (!["on_way", "dispatched"].includes(order.status)) {
      return NextResponse.json({ error: "لا يمكن تأكيد التسليم في هذه الحالة." }, { status: 409 });
    }
    patch.status = "delivered";
    patch.delivered_at = now;
    if (!order.picked_at) patch.picked_at = now;
  }

  const { data: updated, error: upErr } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("driver_id", driverId)
    .select("id, status, picked_at, delivered_at")
    .maybeSingle();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  if (updated?.status) {
    await sendOrderStatusPush(updated.id, updated.status);
  }
  return NextResponse.json({ order: updated });
}
