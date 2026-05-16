import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";
import { createAddressSchema, type CreateAddressInput } from "@/lib/schemas/address";

export async function GET() {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, line1, city, lat, lng, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: Request) {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  let body: CreateAddressInput;
  try {
    const raw = await request.json();
    const parsed = createAddressSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }
  const line1 = body.line1;

  const isDefault = body.isDefault === true;
  if (isDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("profile_id", identity.profileId);
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      profile_id: identity.profileId,
      label: body.label?.trim() || null,
      line1,
      city: body.city?.trim() || null,
      lat: typeof body.lat === "number" ? body.lat : null,
      lng: typeof body.lng === "number" ? body.lng : null,
      is_default: isDefault,
    })
    .select("id, label, line1, city, lat, lng, is_default, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ address: data }, { status: 201 });
}
