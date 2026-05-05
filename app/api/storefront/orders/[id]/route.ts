import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";

export async function GET(
  _request: Request,
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

  const { data: order, error } = await supabase
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
      notes,
      created_at,
      vendor_id,
      driver_id,
      order_items (
        id,
        product_id,
        product_name,
        unit_price,
        quantity,
        line_total,
        products (
          unit,
          image
        )
      )
    `,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
  if (!order.vendor_id) {
    return NextResponse.json({ error: "Vendor data is missing for this order." }, { status: 409 });
  }

  let driver: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string;
    vehicle: string;
  } | null = null;

  const driverId = typeof order.driver_id === "string" ? order.driver_id : "";
  if (driverId) {
    const { data: dr } = await supabase
      .from("delivery_drivers")
      .select("id, name, phone, avatar_url, vehicle")
      .eq("id", driverId)
      .maybeSingle();
    driver = dr ?? null;
  }

  const { data: rating } = await supabase
    .from("ratings")
    .select("id, vendor_rating, driver_rating, comment, created_at")
    .eq("order_id", order.id)
    .maybeSingle();

  return NextResponse.json({ order, driver, rating });
}

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

  let body: { vendorRating?: number; driverRating?: number | null; comment?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }
  const vendorRating = Math.round(Number(body.vendorRating));
  const driverRating =
    body.driverRating == null ? null : Math.round(Number(body.driverRating));
  if (!(vendorRating >= 1 && vendorRating <= 5)) {
    return NextResponse.json({ error: "vendorRating يجب أن تكون بين 1 و 5." }, { status: 400 });
  }
  if (driverRating != null && !(driverRating >= 1 && driverRating <= 5)) {
    return NextResponse.json({ error: "driverRating يجب أن تكون بين 1 و 5." }, { status: 400 });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, customer_id, status, vendor_id, driver_id")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
  if (!order.vendor_id) {
    return NextResponse.json({ error: "Vendor data is missing for this order." }, { status: 409 });
  }
  if (order.status !== "delivered") {
    return NextResponse.json({ error: "يمكن التقييم بعد التسليم فقط." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("ratings")
    .upsert(
      {
        order_id: order.id,
        customer_id: user.id,
        vendor_id: order.vendor_id,
        driver_id: order.driver_id,
        vendor_rating: vendorRating,
        driver_rating: driverRating,
        comment: body.comment?.trim() || null,
      },
      { onConflict: "order_id" },
    )
    .select("id, vendor_rating, driver_rating, comment, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rating: data });
}
