import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { shekelToAgorot } from "@/lib/currency/agorot";
import { updateProductSchema, type UpdateProductInput } from "@/lib/schemas/product";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export async function PATCH(
  request: Request,
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

  let body: UpdateProductInput;
  try {
    const raw = await request.json();
    const parsed = updateProductSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const patch: ProductUpdate = {};

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.brand === "string") patch.brand = body.brand.trim() || null;
  if (typeof body.priceAgorot === "number" && body.priceAgorot >= 0) {
    patch.price = Math.round(body.priceAgorot);
  } else if (typeof body.price === "number" && body.price >= 0) {
    patch.price = shekelToAgorot(body.price);
  }
  if (body.oldPriceAgorot === null || typeof body.oldPriceAgorot === "number") {
    patch.old_price =
      body.oldPriceAgorot === null
        ? null
        : typeof body.oldPriceAgorot === "number" && body.oldPriceAgorot >= 0
          ? Math.round(body.oldPriceAgorot)
          : undefined;
  } else
  if (body.oldPrice === null || typeof body.oldPrice === "number") {
    patch.old_price =
      body.oldPrice === null
        ? null
        : typeof body.oldPrice === "number" && body.oldPrice >= 0
          ? shekelToAgorot(body.oldPrice)
          : undefined;
  }
  if (typeof body.unit === "string") patch.unit = body.unit.trim();
  if (typeof body.image === "string") patch.image = body.image.trim();
  if (body.badge === null || typeof body.badge === "string") {
    patch.badge = body.badge as ProductUpdate["badge"];
  }
  if (body.categoryId === null || typeof body.categoryId === "string") {
    patch.category_id =
      body.categoryId === null ? null : body.categoryId.trim();
  }
  if (typeof body.vendorId === "string") patch.vendor_id = body.vendorId.trim();
  if (typeof body.vendorCategoryId === "string") {
    patch.vendor_category_id = body.vendorCategoryId.trim();
  }
  if (body.menuCategoryId === null || typeof body.menuCategoryId === "string") {
    patch.menu_category_id = body.menuCategoryId as string | null;
  }
  if (typeof body.isOffer === "boolean") patch.is_offer = body.isOffer;
  if (typeof body.isTrending === "boolean") patch.is_trending = body.isTrending;
  if (typeof body.isActive === "boolean") patch.is_active = body.isActive;

  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as ProductUpdate;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .update(cleanPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("products", "max");
  revalidateTag("vendors", "max");

  return NextResponse.json({ product: data });
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
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("products", "max");
  revalidateTag("vendors", "max");

  return NextResponse.json({ ok: true });
}
