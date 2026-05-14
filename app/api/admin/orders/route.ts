import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { sendOrderStatusPush } from "@/lib/push/web-push";

const ALLOWED_STATUSES = new Set([
  "new",
  "broadcast",
  "accepted",
  "preparing",
  "ready",
  "dispatched",
  "on_way",
  "delivered",
  "cancelled",
  "rejected",
]);

const AVG_SPEED_KMH = 30;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ orders: [], vendors: [] });
  }

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId");
  const status = searchParams.get("status");

  const supabase = createServerSupabase();
  let q = supabase
    .from("orders")
    .select(
      `
      id,
      short_code,
      customer_name,
      customer_phone,
      customer_address,
      subtotal,
      delivery_fee,
      total,
      status,
      payment_method,
      notes,
      created_at,
      accepted_at,
      ready_at,
      picked_at,
      delivered_at,
      cancellation_reason,
      vendor_id,
      driver_id,
      broadcast_at,
      claimed_at,
      claimed_by,
      vendors (
        id,
        name,
        slug
      ),
      order_items (
        id,
        product_id,
        product_name,
        unit_price,
        quantity,
        line_total
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (vendorId) {
    q = q.eq("vendor_id", vendorId);
  }
  if (status && ALLOWED_STATUSES.has(status)) {
    q = q.eq("status", status);
  }

  const [{ data: orders, error: ordersError }, { data: vendors, error: vendorsError }] =
    await Promise.all([
      q,
      supabase.from("vendors").select("id, name, slug").order("name", { ascending: true }),
    ]);

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }
  if (vendorsError) {
    return NextResponse.json({ error: vendorsError.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: orders ?? [],
    vendors: vendors ?? [],
  });
}

export async function PATCH(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  let body: {
    orderId?: string;
    status?: string;
    driverId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId مطلوب." }, { status: 400 });
  }

  const patch: Database["public"]["Tables"]["orders"]["Update"] = {};
  if (typeof body.status === "string") {
    const status = body.status.trim();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "حالة الطلب غير مدعومة." }, { status: 400 });
    }
    patch.status = status;
    const now = new Date().toISOString();
    if (status === "accepted") patch.accepted_at = now;
    if (status === "ready") patch.ready_at = now;
    if (status === "dispatched") patch.picked_at = now;
    if (status === "delivered") patch.delivered_at = now;
  }

  if (body.driverId === null) {
    patch.driver_id = null;
  } else if (typeof body.driverId === "string") {
    patch.driver_id = body.driverId.trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "أرسل status أو driverId على الأقل." },
      { status: 400 },
    );
  }

  const supabase = createServerSupabase();
  if (patch.status === "accepted") {
    const { data: orderForEta } = await supabase
      .from("orders")
      .select("id, vendor_id, location_lat, location_lng")
      .eq("id", orderId)
      .maybeSingle();
    if (orderForEta?.vendor_id) {
      const { data: vendorForEta } = await supabase
        .from("vendors")
        .select("default_prep_minutes, location_lat, location_lng")
        .eq("id", orderForEta.vendor_id)
        .maybeSingle();

      const prepMinutes = Math.max(0, Math.round(vendorForEta?.default_prep_minutes ?? 25));
      let etaMinutes = prepMinutes;
      if (
        vendorForEta?.location_lat != null &&
        vendorForEta?.location_lng != null &&
        orderForEta.location_lat != null &&
        orderForEta.location_lng != null
      ) {
        const distanceKm = haversineKm(
          vendorForEta.location_lat,
          vendorForEta.location_lng,
          orderForEta.location_lat,
          orderForEta.location_lng,
        );
        const driveMinutes = Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
        etaMinutes = prepMinutes + driveMinutes;
      }
      patch.eta_minutes = etaMinutes;
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select(
      "id, status, driver_id, eta_minutes, accepted_at, ready_at, picked_at, delivered_at, cancellation_reason",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
  }

  if (typeof patch.status === "string") {
    await sendOrderStatusPush(data.id, patch.status);
  }

  return NextResponse.json({ order: data });
}
