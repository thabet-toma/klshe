import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";
import type { Database } from "@/lib/supabase/types";
import { updateAddressSchema, type UpdateAddressInput } from "@/lib/schemas/address";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  let body: UpdateAddressInput;
  try {
    const raw = await request.json();
    const parsed = updateAddressSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const patch: Database["public"]["Tables"]["addresses"]["Update"] = {};
  if (typeof body.label === "string" || body.label === null) patch.label = body.label?.trim() || null;
  if (typeof body.line1 === "string") patch.line1 = body.line1.trim();
  if (typeof body.city === "string" || body.city === null) patch.city = body.city?.trim() || null;
  if (typeof body.lat === "number" || body.lat === null) patch.lat = body.lat;
  if (typeof body.lng === "number" || body.lng === null) patch.lng = body.lng;

  if (patch.line1 === "") {
    return NextResponse.json({ error: "line1 لا يمكن أن يكون فارغاً." }, { status: 400 });
  }

  if (body.isDefault === true) {
    await supabase.from("addresses").update({ is_default: false }).eq("profile_id", identity.profileId);
    patch.is_default = true;
  } else if (body.isDefault === false) {
    patch.is_default = false;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("addresses")
    .update(patch)
    .eq("id", id)
    .eq("profile_id", identity.profileId)
    .select("id, label, line1, city, lat, lng, is_default, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "العنوان غير موجود." }, { status: 404 });

  return NextResponse.json({ address: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id مطلوب." }, { status: 400 });

  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("profile_id", identity.profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
