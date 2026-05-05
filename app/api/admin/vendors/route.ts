import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

/** قائمة المتاجر — لوحة المنصة (فلترة المنتجات وغيرها). */
export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({
      vendors: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          slug: "jetek-main",
          name: "جيتك — المتجر الرئيسي",
          is_active: true,
        },
      ],
    });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, slug, name, is_active, category_id")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vendors: data ?? [] });
}
