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
    .select("id, slug, name, is_active, category_id, commission_rate")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vendors: data ?? [] });
}

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Supabase غير مهيأ. أضف المفاتيح في .env.local" },
      { status: 503 },
    );
  }

  let body: { name?: string; commission_rate?: number; description?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "اسم المتجر مطلوب." }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50) || "store";

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      slug: `${slug}-${crypto.randomUUID().slice(0, 6)}`,
      name,
      description: body.description?.trim() || null,
      category_id: "cat_grocery",
      vendor_category_id: "vc_grocery",
      commission_rate: typeof body.commission_rate === "number" ? Math.max(0, Math.min(100, body.commission_rate)) : 10,
      is_active: true,
    })
    .select("id, slug, name, is_active, commission_rate")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vendor: data }, { status: 201 });
}
