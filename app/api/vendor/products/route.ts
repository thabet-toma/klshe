import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import type { Database } from "@/lib/supabase/types";
import { shekelToAgorot } from "@/lib/currency/agorot";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

export async function GET(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const requestedVendor = searchParams.get("vendorId");
  const vendorId = pickVendorId(vendorIds, requestedVendor);
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({ products: [] });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const requestedVendor = searchParams.get("vendorId");
  const vendorId = pickVendorId(vendorIds, requestedVendor);
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json(
        { error: "لا يمكن الإنشاء دون ربط خادم Supabase." },
        { status: 503 },
      );
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  let body: {
    name?: string;
    brand?: string;
    price?: number;
    oldPrice?: number | null;
    unit?: string;
    image?: string;
    badge?: ProductInsert["badge"];
    categoryId?: string;
    menuCategoryId?: string | null;
    isOffer?: boolean;
    isTrending?: boolean;
    isActive?: boolean;
    priceAgorot?: number;
    oldPriceAgorot?: number | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "اسم المنتج مطلوب." }, { status: 400 });
  }
  const category_id = body.categoryId?.trim();
  if (!category_id) {
    return NextResponse.json({ error: "تصنيف المنتج مطلوب." }, { status: 400 });
  }

  if (body.menuCategoryId) {
    const { data: mc } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("id", body.menuCategoryId)
      .eq("vendor_id", vendorId)
      .maybeSingle();
    if (!mc) {
      return NextResponse.json(
        { error: "فئة القائمة لا تنتمي لهذا المتجر." },
        { status: 400 },
      );
    }
  }

  const id = `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const { data: vendorRef } = await supabase
    .from("vendors")
    .select("vendor_category_id")
    .eq("id", vendorId)
    .maybeSingle();
  const vendor_category_id = vendorRef?.vendor_category_id ?? "vc_grocery";

  const row: ProductInsert = {
    id,
    name,
    brand: body.brand?.trim() || null,
    price:
      typeof body.priceAgorot === "number" && body.priceAgorot >= 0
        ? Math.round(body.priceAgorot)
        : typeof body.price === "number" && body.price >= 0
          ? shekelToAgorot(body.price)
          : 0,
    old_price:
      typeof body.oldPriceAgorot === "number" && body.oldPriceAgorot >= 0
        ? Math.round(body.oldPriceAgorot)
        : typeof body.oldPrice === "number" && body.oldPrice >= 0
          ? shekelToAgorot(body.oldPrice)
          : null,
    unit: body.unit?.trim() || "قطعة",
    image:
      body.image?.trim() ||
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80&auto=format&fit=crop",
    badge: body.badge ?? null,
    category_id,
    vendor_category_id,
    vendor_id: vendorId,
    menu_category_id: body.menuCategoryId?.trim() || null,
    is_offer: Boolean(body.isOffer),
    is_trending: Boolean(body.isTrending),
    is_active: body.isActive !== false,
  };

  const { data, error } = await supabase.from("products").insert(row).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
