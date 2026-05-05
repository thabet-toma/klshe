import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { categories as mockCategories } from "@/lib/data";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ categories: mockCategories });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
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

  let body: { id?: string; name?: string; emoji?: string; color?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "اسم التصنيف مطلوب." }, { status: 400 });
  }

  const id =
    body.id?.trim() ||
    `c_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      id,
      name,
      emoji: body.emoji?.trim() || "🛒",
      color: body.color?.trim() || "from-orange-100 to-orange-200",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}
