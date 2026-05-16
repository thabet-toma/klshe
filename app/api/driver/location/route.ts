import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";

export async function PUT(request: Request) {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

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
    .eq("user_id", identity.profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
