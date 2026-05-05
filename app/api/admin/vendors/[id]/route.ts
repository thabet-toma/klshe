import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "خادم Supabase غير مهيأ." }, { status: 503 });
  }

  let body: { is_active?: boolean; commission_rate?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const patch: VendorUpdate = {};
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.commission_rate === "number") {
    patch.commission_rate = Math.max(0, Math.min(100, Number(body.commission_rate)));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا تغييرات." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", id)
    .select("id, slug, name, is_active, commission_rate")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendor: data });
}
