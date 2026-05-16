import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";
import { sendOrderStatusPush } from "@/lib/push/web-push";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { log } from "@/lib/log";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    key: `claim-order:${ip}`,
    limit: 10,
    windowMs: 60_000,
    windowLabel: "1 m",
  });
  if (!rl.success) {
    return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً." }, { status: 429 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  // Verify the user is an active driver
  const { data: driverRow } = await supabase
    .from("delivery_drivers")
    .select("id, status")
    .eq("user_id", identity.profileId)
    .maybeSingle();

  if (!driverRow?.id) {
    return NextResponse.json({ error: "حسابك ليس سائقاً معتمداً." }, { status: 403 });
  }

  if (driverRow.status === "offline") {
    return NextResponse.json({ error: "حساب السائق غير نشط." }, { status: 403 });
  }

  // Parse the request body
  let body: { orderId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId مطلوب." }, { status: 400 });
  }

  // Use a transaction to safely claim the order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('claim_order', {
    p_order_id: orderId,
    p_driver_id: driverRow.id
  });

  if (error) {
    console.error("Error claiming order:", error);
    
    // Handle specific error cases
    if (error.message.includes('ORDER_NOT_FOUND')) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }
    if (error.message.includes('ORDER_NOT_AVAILABLE_FOR_CLAIM')) {
      return NextResponse.json({ error: "هذا الطلب غير متاح للمطالبة حالياً." }, { status: 409 });
    }
    if (error.message.includes('ORDER_ALREADY_CLAIMED')) {
      return NextResponse.json({ error: "لقد تم مطالبة هذا الطلب بالفعل من قبل سائق آخر." }, { status: 409 });
    }
    if (error.message.includes('DRIVER_NOT_FOUND_OR_INACTIVE')) {
      return NextResponse.json({ error: "حساب السائق غير نشط." }, { status: 403 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if the claim was successful
  if (!data || !data.success) {
    const errorType = data?.error || 'UNKNOWN_ERROR';
    
    if (errorType === 'ORDER_ALREADY_CLAIMED') {
      return NextResponse.json({ 
        error: "لقد تم مطالبة هذا الطلب بالفعل من قبل سائق آخر." 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: `فشلت عملية المطالبة: ${errorType}` 
    }, { status: 400 });
  }

  // Log the successful claim
  log.info("order_claimed", { order_id: orderId, driver_id: driverRow.id });

  // T4.2: compute & persist ETA (vendor → customer leg) at claim time.
  // Haversine + urban average speed; Mapbox not configured in this env.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: o } = await (supabase as any)
      .from("orders")
      .select("location_lat, location_lng, vendor_id")
      .eq("id", orderId)
      .maybeSingle();
    if (o?.location_lat != null && o?.location_lng != null && o?.vendor_id) {
      const { data: v } = await supabase
        .from("vendors")
        .select("location_lat, location_lng")
        .eq("id", o.vendor_id)
        .maybeSingle();
      if (v?.location_lat != null && v?.location_lng != null) {
        const R = 6371;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(o.location_lat - v.location_lat);
        const dLon = toRad(o.location_lng - v.location_lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(v.location_lat)) * Math.cos(toRad(o.location_lat)) * Math.sin(dLon / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const etaMinutes = Math.max(5, Math.ceil((distKm / 30) * 60) + 5); // +5min pickup buffer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("orders").update({ eta_minutes: etaMinutes }).eq("id", orderId);
      }
    }
  } catch (etaErr) {
    log.warn("eta_compute_failed", { order_id: orderId, error: String(etaErr) });
  }
  
  // Send push notification about the order status change
  try {
    await sendOrderStatusPush(orderId, 'dispatched');
  } catch (pushError) {
    console.error("Failed to send push notification:", pushError);
    // Continue execution even if push notification fails
  }

  // Fetch the updated order details to return to the driver
  const { data: updatedOrder, error: fetchError } = await supabase
    .from("orders")
    .select(`
      id,
      short_code,
      status,
      customer_name,
      customer_phone,
      customer_address,
      total,
      payment_method,
      notes,
      created_at,
      picked_at,
      vendors (
        id,
        name,
        slug
      ),
      order_items (
        id,
        product_name,
        quantity,
        line_total
      )
    `)
    .eq("id", orderId)
    .single();

  if (fetchError) {
    console.error("Error fetching updated order:", fetchError);
    // Return success with minimal data if we can't fetch the full order
    return NextResponse.json({
      success: true,
      order: {
        id: data.order_id,
        status: 'dispatched',
        claimed_at: data.claimed_at,
        driver_id: data.driver_id
      },
      message: "تم مطالبة الطلب بنجاح"
    });
  }

  return NextResponse.json({
    success: true,
    order: updatedOrder,
    message: "تم مطالبة الطلب بنجاح"
  });
}