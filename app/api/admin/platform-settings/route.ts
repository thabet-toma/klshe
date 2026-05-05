import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ settings: {} });
  }
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("platform_settings").select("key, value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const settings: Record<string, unknown> = {};
  for (const r of data ?? []) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "خادم Supabase غير مهيأ." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: value as Json,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("platform_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
