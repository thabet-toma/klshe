import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  const routeSb = await createRouteHandlerSupabase();
  if (!routeSb) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }

  const {
    data: { user },
  } = await routeSb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const { data: driverRow } = await routeSb
    .from("delivery_drivers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!driverRow?.id) {
    return NextResponse.json({ error: "حسابك ليس سائقاً معتمداً." }, { status: 403 });
  }

  const supabase = createServerSupabase();
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
    .eq("driver_id", driverRow.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [], driverId: driverRow.id });
}
