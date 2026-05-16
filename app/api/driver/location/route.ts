import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const authSb = await createRouteHandlerSupabase();
  if (!authSb) return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });

  const { data: { user } } = await authSb.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });

  let body: { lat?: number; lng?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const lat = body.lat;
  const lng = body.lng;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng مطلوبان." }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) return NextResponse.json({ ok: true });

  const supabase = createServerSupabase();
  // current_lat/current_lng exist in DB but not in generated types yet
  const { error } = await (supabase as any)
    .from("delivery_drivers")
    .update({ current_lat: lat, current_lng: lng })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
