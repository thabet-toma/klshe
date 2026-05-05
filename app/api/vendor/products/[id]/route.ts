import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { shekelToAgorot } from "@/lib/currency/agorot";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

type DbClient = ReturnType<typeof createServerSupabase>;

async function assertVendorOwnsProduct(
  supabase: DbClient,
  productId: string,
  vendorIds: string[],
) {
  const { data, error } = await supabase
    .from("products")
    .select("vendor_id")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data?.vendor_id || !vendorIds.includes(data.vendor_id)) {
    return false;
  }
  return true;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json(
        { error: "لا يمكن التعديل دون Supabase." },
        { status: 503 },
      );
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { id } = await params;
  const owns = await assertVendorOwnsProduct(supabase, id, vendorIds);
  if (!owns) {
    return NextResponse.json({ error: "المنتج غير موجود أو ليس ضمن صلاحياتك." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
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
  if (typeof body.vendorCategoryId === "string") {
    patch.vendor_category_id = body.vendorCategoryId.trim();
  }
  if (body.menuCategoryId === null || typeof body.menuCategoryId === "string") {
    const mid = body.menuCategoryId as string | null;
    if (mid) {
      const { data: mc } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("id", mid)
        .eq("vendor_id", vendorId)
        .maybeSingle();
      if (!mc) {
        return NextResponse.json(
          { error: "فئة القائمة لا تنتمي لهذا المتجر." },
          { status: 400 },
        );
      }
    }
    patch.menu_category_id = mid;
  }
  if (typeof body.isOffer === "boolean") patch.is_offer = body.isOffer;
  if (typeof body.isTrending === "boolean") patch.is_trending = body.isTrending;
  if (typeof body.isActive === "boolean") patch.is_active = body.isActive;

  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as ProductUpdate;

  const { data, error } = await supabase
    .from("products")
    .update(cleanPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json(
        { error: "لا يمكن الحذف دون Supabase." },
        { status: 503 },
      );
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { id } = await params;
  const owns = await assertVendorOwnsProduct(supabase, id, vendorIds);
  if (!owns) {
    return NextResponse.json({ error: "المنتج غير موجود أو ليس ضمن صلاحياتك." }, { status: 403 });
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
