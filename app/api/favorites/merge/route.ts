import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";

type Body = { productIds?: unknown };

/**
 * بعد تسجيل الدخول: دمج معرفات محلية مع السيرفر — يُدرج كل منتج نشط مرة واحدة.
 */
export async function POST(request: Request) {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const raw = body.productIds;
  const productIds = Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  const unique = [...new Set(productIds)];
  if (unique.length === 0) {
    const { data } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", identity.profileId);
    const ids = (data ?? []).map((r) => r.product_id);
    return NextResponse.json({ ids });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id,vendor_id")
    .in("id", unique)
    .eq("is_active", true);

  const rows =
    products
      ?.filter((p): p is typeof p & { vendor_id: string } => p.vendor_id != null)
      .map((p) => ({
        user_id: identity.profileId,
        product_id: p.id,
        vendor_id: p.vendor_id,
      })) ?? [];

  for (const row of rows) {
    const { error } = await supabase.from("favorites").insert(row);
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data: all } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", identity.profileId);

  const ids = (all ?? []).map((r) => r.product_id);
  return NextResponse.json({ ids });
}
