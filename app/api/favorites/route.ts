import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";

/** قائمة معرفات المنتجات المفضّلة للمستخدم المسجّل — بدون جلسة تُرجع مصفوفة فارغة. */
export async function GET() {
  const supabase = await createRouteHandlerSupabase();
  if (!supabase) {
    return NextResponse.json({ ids: [] as string[] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ids: [] as string[] });
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (data ?? []).map((r) => r.product_id);
  return NextResponse.json({ ids });
}

type PostBody = {
  productId?: string;
  vendorId?: string;
};

/** إضافة منتج للمفضلة — يتحقق من vendor عبر المنتج إن لزم. */
export async function POST(request: Request) {
  const supabase = await createRouteHandlerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "productId مطلوب." }, { status: 400 });
  }

  let vendorId =
    typeof body.vendorId === "string" && body.vendorId.length > 0
      ? body.vendorId
      : null;

  if (!vendorId) {
    const { data: row } = await supabase
      .from("products")
      .select("vendor_id")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();
    vendorId = row?.vendor_id ?? null;
  }

  if (!vendorId) {
    return NextResponse.json({ error: "المنتج غير موجود." }, { status: 404 });
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: user.id,
    product_id: productId,
    vendor_id: vendorId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** إزالة منتج من المفضلة. */
export async function DELETE(request: Request) {
  const supabase = await createRouteHandlerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const productId = new URL(request.url).searchParams.get("productId") ?? "";
  if (!productId) {
    return NextResponse.json({ error: "productId مطلوب." }, { status: 400 });
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
