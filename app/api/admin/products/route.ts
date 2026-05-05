import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import {
  allProducts,
  offersToday,
  trending,
} from "@/lib/data";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";
import { shekelToAgorot } from "@/lib/currency/agorot";
import { createProductSchema, type CreateProductInput } from "@/lib/schemas/product";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

function mockProductsRows() {
  const offerIds = new Set(offersToday.map((p) => p.id));
  const trendIds = new Set(trending.map((p) => p.id));
  return allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    price: p.price,
    old_price: p.oldPrice ?? null,
    unit: p.unit,
    image: p.image,
    badge: p.badge ?? null,
    category_id: p.categoryId,
    vendor_category_id: "vc_grocery",
    is_offer: offerIds.has(p.id),
    is_trending: trendIds.has(p.id),
    is_active: true,
    created_at: new Date().toISOString(),
    vendor_id: DEFAULT_VENDOR_ID,
    menu_category_id: null,
  }));
}

export async function GET(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ products: mockProductsRows() });
  }

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId");

  const supabase = createServerSupabase();
  let q = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (vendorId) {
    q = q.eq("vendor_id", vendorId);
  }
  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
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

  let body: CreateProductInput;
  try {
    const raw = await request.json();
    const parsed = createProductSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "اسم المنتج مطلوب." }, { status: 400 });
  }

  const category_id = body.categoryId?.trim();
  if (!category_id) {
    return NextResponse.json({ error: "تصنيف المنتج (categoryId) مطلوب." }, { status: 400 });
  }

  const vendor_id = body.vendorId?.trim() ?? DEFAULT_VENDOR_ID;
  const supabase = createServerSupabase();
  const { data: vendorRef } = await supabase
    .from("vendors")
    .select("vendor_category_id")
    .eq("id", vendor_id)
    .maybeSingle();
  const vendor_category_id = vendorRef?.vendor_category_id ?? "vc_grocery";

  const id =
    `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

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
    vendor_id,
    menu_category_id: body.menuCategoryId?.trim() || null,
    is_offer: Boolean(body.isOffer),
    is_trending: Boolean(body.isTrending),
    is_active: body.isActive !== false,
  };

  const { data, error } = await supabase.from("products").insert(row).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("products", "max");
  revalidateTag("vendors", "max");

  return NextResponse.json({ product: data }, { status: 201 });
}
