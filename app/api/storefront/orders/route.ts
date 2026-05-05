import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";

export async function GET() {
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

  const { data, error } = await supabase
    .from("orders")
    .select("id, short_code, status, total, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
