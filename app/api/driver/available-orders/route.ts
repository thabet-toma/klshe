import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";

export async function GET() {
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

  const { data, error } = await supabase
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
      broadcast_at,
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
    .eq("status", "broadcast")
    .is("claimed_by", null)
    .order("broadcast_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Error fetching broadcasted orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    orders: data ?? [], 
    driverId: driverRow.id,
    message: data && data.length > 0 
      ? `Found ${data.length} available orders` 
      : "No available orders at the moment"
  });
}