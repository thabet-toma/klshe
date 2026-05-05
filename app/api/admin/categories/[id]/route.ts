import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

type Row = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Supabase غير مهيأ. أضف المفاتيح في .env.local" },
      { status: 503 },
    );
  }

  const { id } = await params;

  let body: { name?: string; emoji?: string; color?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const patch: Partial<Pick<Row, "name" | "emoji" | "color">> = {};
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json({ error: "الاسم لا يمكن أن يكون فارغاً." }, { status: 400 });
    }
    patch.name = n;
  }
  if (body.emoji !== undefined) {
    patch.emoji = body.emoji.trim() || "🛒";
  }
  if (body.color !== undefined) {
    patch.color = body.color.trim() || "from-orange-100 to-orange-200";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا يوجد حقل للتحديث." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "التصنيف غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Supabase غير مهيأ. أضف المفاتيح في .env.local" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const supabase = createServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "23503" ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
