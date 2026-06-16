import {
  categories as fallbackCategories,
  offersToday as fallbackOffers,
  Product,
  productsById,
  trending as fallbackTrending,
  allProducts as fallbackAllProducts,
} from "@/lib/data";
import { unstable_cache } from "next/cache";
import type { Category } from "@/lib/data";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";
import { createServerSupabase, isSupabaseServerConfigured } from "./server";
import type { Database } from "./types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export type VendorSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category_id: string;
  default_prep_minutes: number;
  min_order_amount: number;
  delivery_fee_base: number;
  /** مسافة تقريبية بالمتر — عند طلب «متاجر قريبة» فقط */
  distance_m?: number;
  rating_avg?: number;
  is_open?: boolean;
};

/** أنواع المتاجر (mock / بدون Supabase) — يطابق بذور migration_004. */
export const FALLBACK_VENDOR_CATEGORIES: Category[] = [
  {
    id: "vc_restaurants",
    slug: "restaurants",
    name: "مطاعم",
    emoji: "🍔",
    color: "from-rose-100 to-rose-200",
  },
  {
    id: "vc_grocery",
    slug: "grocery",
    name: "بقالة",
    emoji: "🛒",
    color: "from-orange-100 to-orange-200",
  },
  {
    id: "vc_pharmacy",
    slug: "pharmacy",
    name: "صيدلية",
    emoji: "💊",
    color: "from-emerald-100 to-teal-200",
  },
  {
    id: "vc_sweets",
    slug: "sweets",
    name: "حلويات",
    emoji: "🍰",
    color: "from-pink-100 to-fuchsia-200",
  },
  {
    id: "vc_beverages",
    slug: "beverages",
    name: "مشروبات",
    emoji: "🥤",
    color: "from-sky-100 to-indigo-200",
  },
];

function gradientForVendorCategorySlug(slug: string): string {
  const map: Record<string, string> = {
    restaurants: "from-rose-100 to-rose-200",
    grocery: "from-orange-100 to-orange-200",
    pharmacy: "from-emerald-100 to-teal-200",
    sweets: "from-pink-100 to-fuchsia-200",
    beverages: "from-sky-100 to-indigo-200",
  };
  return map[slug] ?? "from-neutral-100 to-neutral-200";
}

function mapVendorCategory(row: {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    emoji: row.emoji ?? "🛒",
    color: gradientForVendorCategorySlug(row.slug),
  };
}

function resolveVendorCategorySync(param: string): Category | null {
  const fromVc = FALLBACK_VENDOR_CATEGORIES.find(
    (c) => c.id === param || c.slug === param,
  );
  if (fromVc) return fromVc;
  return (
    fallbackCategories.find((c) => c.id === param || c.slug === param) ?? null
  );
}

export function mapProduct(
  row: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    old_price: number | null;
    unit: string;
    image: string;
    badge: "خصم" | "جديد" | "الأكثر مبيعاً" | null;
    category_id: string | null;
    vendor_id?: string | null;
  },
  vendorMeta?: { name: string; slug: string } | null,
): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    unit: row.unit,
    image: row.image,
    badge: row.badge ?? undefined,
    categoryId: row.category_id ?? "c1",
    vendorId: row.vendor_id ?? DEFAULT_VENDOR_ID,
    vendorName: vendorMeta?.name,
    vendorSlug: vendorMeta?.slug,
  };
}

export function mapVendor(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category_id: string;
  vendor_category_id?: string | null;
  default_prep_minutes: number;
  min_order_amount: number;
  delivery_fee_base: number;
  location_lat?: number | null;
  location_lng?: number | null;
  rating_avg?: number | null;
  is_open?: boolean | null;
}): VendorSummary {
  const cat =
    row.vendor_category_id && row.vendor_category_id.length > 0
      ? row.vendor_category_id
      : row.category_id;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logo_url: row.logo_url,
    banner_url: row.banner_url,
    category_id: cat,
    default_prep_minutes: row.default_prep_minutes,
    min_order_amount: Number(row.min_order_amount),
    delivery_fee_base: Number(row.delivery_fee_base),
    rating_avg:
      typeof row.rating_avg === "number" ? Number(row.rating_avg.toFixed(1)) : undefined,
    is_open: row.is_open ?? true,
  };
}

const MOCK_VENDOR_ROW: VendorSummary = {
  id: DEFAULT_VENDOR_ID,
  slug: "jetek-main",
  name: "جيتك — المتجر الرئيسي",
  description: "متجر افتراضي للمعاينة",
  logo_url: null,
  banner_url:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&auto=format&fit=crop",
  category_id: "vc_grocery",
  default_prep_minutes: 25,
  min_order_amount: 0,
  delivery_fee_base: 0,
};

async function withVendorRatings(
  supabase: ReturnType<typeof createServerSupabase>,
  vendors: VendorSummary[],
): Promise<VendorSummary[]> {
  if (!vendors.length) return vendors;
  const vendorIds = vendors.map((v) => v.id);
  const { data: ratings } = await supabase
    .from("ratings")
    .select("vendor_id, vendor_rating")
    .in("vendor_id", vendorIds);
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const r of ratings ?? []) {
    const prev = buckets.get(r.vendor_id) ?? { sum: 0, count: 0 };
    buckets.set(r.vendor_id, { sum: prev.sum + r.vendor_rating, count: prev.count + 1 });
  }
  return vendors.map((v) => {
    const b = buckets.get(v.id);
    if (!b?.count) return v;
    return { ...v, rating_avg: Number((b.sum / b.count).toFixed(1)) };
  });
}

async function getStorefrontDataImpl() {
  if (!isSupabaseServerConfigured) {
    return {
      categories: FALLBACK_VENDOR_CATEGORIES,
      trending: fallbackTrending,
      offersToday: fallbackOffers,
      source: "mock" as const,
    };
  }

  try {
    const supabase = createServerSupabase();

    const [catRes, offersRes, trendingRes] = await Promise.all([
      supabase
        .from("vendor_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_offer", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_trending", true)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

    if (catRes.error || offersRes.error || trendingRes.error) {
      throw catRes.error ?? offersRes.error ?? trendingRes.error;
    }

    const mappedCategories = (catRes.data ?? []).map((r) =>
      mapVendorCategory(r),
    );

    const offerRows = offersRes.data ?? [];
    const vendorIds = [
      ...new Set(
        offerRows
          .map((r) => r.vendor_id)
          .filter((x): x is string => Boolean(x)),
      ),
    ];
    const vendorMap = new Map<string, { name: string; slug: string }>();
    if (vendorIds.length) {
      const { data: vrows } = await supabase
        .from("vendors")
        .select("id, name, slug")
        .in("id", vendorIds);
      for (const v of vrows ?? []) {
        vendorMap.set(v.id, { name: v.name, slug: v.slug });
      }
    }

    const offersToday = offerRows.map((r) =>
      mapProduct(
        r,
        r.vendor_id ? (vendorMap.get(r.vendor_id) ?? null) : null,
      ),
    );

    const trending = (trendingRes.data ?? []).map((r) => mapProduct(r));

    return {
      categories: mappedCategories.length
        ? mappedCategories
        : FALLBACK_VENDOR_CATEGORIES,
      offersToday: offersToday.length ? offersToday : fallbackOffers,
      trending: trending.length ? trending : fallbackTrending,
      source: "supabase" as const,
    };
  } catch {
    return {
      categories: FALLBACK_VENDOR_CATEGORIES,
      trending: fallbackTrending,
      offersToday: fallbackOffers,
      source: "mock" as const,
    };
  }
}

async function getProductByIdImpl(id: string): Promise<Product | null> {
  if (!isSupabaseServerConfigured) {
    return productsById.get(id) ?? null;
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return productsById.get(id) ?? null;
    return mapProduct(data);
  } catch {
    return productsById.get(id) ?? null;
  }
}

/** تصنيف متجر بالمعرّف أو بالـ slug (مثل grocery، vc_grocery). */
export async function resolveVendorCategory(
  param: string,
): Promise<Category | null> {
  if (!isSupabaseServerConfigured) {
    return resolveVendorCategorySync(param);
  }

  try {
    const supabase = createServerSupabase();
    const { data: byId } = await supabase
      .from("vendor_categories")
      .select("*")
      .eq("id", param)
      .eq("is_active", true)
      .maybeSingle();
    if (byId) return mapVendorCategory(byId);

    const { data: bySlug } = await supabase
      .from("vendor_categories")
      .select("*")
      .eq("slug", param)
      .eq("is_active", true)
      .maybeSingle();
    if (bySlug) return mapVendorCategory(bySlug);

    return resolveVendorCategorySync(param);
  } catch {
    return resolveVendorCategorySync(param);
  }
}

/** @deprecated استخدم resolveVendorCategory */
export async function getCategoryById(id: string): Promise<Category | null> {
  return resolveVendorCategory(id);
}

async function getProductsByCategoryIdImpl(categoryId: string): Promise<Product[]> {
  if (!isSupabaseServerConfigured) {
    return fallbackAllProducts.filter((p) => p.categoryId === categoryId);
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      return fallbackAllProducts.filter((p) => p.categoryId === categoryId);
    }
    return data.map((r) => mapProduct(r));
  } catch {
    return fallbackAllProducts.filter((p) => p.categoryId === categoryId);
  }
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
): Promise<Product[]> {
  if (!isSupabaseServerConfigured) {
    return fallbackTrending.filter((p) => p.id !== excludeId).slice(0, 4);
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("category_id", categoryId)
      .neq("id", excludeId)
      .limit(4);

    if (error || !data?.length) {
      return fallbackTrending.filter((p) => p.id !== excludeId).slice(0, 4);
    }

    return data.map((r) => mapProduct(r));
  } catch {
    return fallbackTrending.filter((p) => p.id !== excludeId).slice(0, 4);
  }
}

const VENDOR_LIST_SELECT =
  "id, slug, name, description, logo_url, banner_url, category_id, vendor_category_id, default_prep_minutes, min_order_amount, delivery_fee_base, is_open" as const;

async function getFeaturedVendorsImpl(limit = 8): Promise<VendorSummary[]> {
  if (!isSupabaseServerConfigured) {
    return [MOCK_VENDOR_ROW];
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("vendors")
      .select(VENDOR_LIST_SELECT)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(limit);

    if (error || !data?.length) {
      return [MOCK_VENDOR_ROW];
    }
    return withVendorRatings(
      supabase,
      data.map((v) => mapVendor(v)),
    );
  } catch {
    return [MOCK_VENDOR_ROW];
  }
}

async function getVendorsForCategoryImpl(
  categoryKey: string,
): Promise<VendorSummary[]> {
  const resolved = await resolveVendorCategory(categoryKey);
  if (!resolved) return [];

  if (!isSupabaseServerConfigured) {
    return MOCK_VENDOR_ROW.category_id === resolved.id
      ? [MOCK_VENDOR_ROW]
      : [];
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("vendors")
      .select(VENDOR_LIST_SELECT)
      .eq("vendor_category_id", resolved.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error || !data?.length) {
      return [];
    }
    return withVendorRatings(
      supabase,
      data.map((v) => mapVendor(v)),
    );
  } catch {
    return [];
  }
}

export type StoreSection = { id: string; name: string; products: Product[] };

async function getVendorStorePageDataImpl(
  slug: string,
): Promise<{ vendor: VendorSummary; sections: StoreSection[] } | null> {
  if (!isSupabaseServerConfigured) {
    if (slug !== MOCK_VENDOR_ROW.slug) {
      return null;
    }
    const products = fallbackAllProducts.map((p) => ({
      ...p,
      vendorId: DEFAULT_VENDOR_ID,
    }));
    return {
      vendor: MOCK_VENDOR_ROW,
      sections: [{ id: "all", name: "جميع المنتجات", products }],
    };
  }

  try {
    const supabase = createServerSupabase();
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (vendorErr || !vendor) {
      return null;
    }

    const [{ data: menuCats }, { data: productRows }] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("vendor_id", vendor.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    const rows = productRows ?? [];
    const menuSorted = [...(menuCats ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    const sections: StoreSection[] = [];
    for (const mc of menuSorted) {
      const inRows = rows.filter((r) => r.menu_category_id === mc.id);
      if (inRows.length) {
        sections.push({
          id: mc.id,
          name: mc.name,
          products: inRows.map((r) => mapProduct(r)),
        });
      }
    }

    const uncategorized = rows.filter((r) => !r.menu_category_id);
    if (uncategorized.length) {
      sections.push({
        id: "uncategorized",
        name: "آخر",
        products: uncategorized.map((r) => mapProduct(r)),
      });
    }

    if (sections.length === 0 && rows.length) {
      sections.push({
        id: "all",
        name: "المنتجات",
        products: rows.map((r) => mapProduct(r)),
      });
    }

    return {
      vendor: mapVendor(vendor),
      sections,
    };
  } catch {
    return null;
  }
}

export const getStorefrontData = unstable_cache(getStorefrontDataImpl, ["storefront-home"], {
  revalidate: 120,
  tags: ["products", "vendors"],
});

export const getFeaturedVendors = unstable_cache(
  async (limit: number) => getFeaturedVendorsImpl(limit),
  ["featured-vendors"],
  { revalidate: 120, tags: ["vendors"] },
);

export const getVendorsForCategory = unstable_cache(
  async (categoryKey: string) => getVendorsForCategoryImpl(categoryKey),
  ["vendors-by-category"],
  { revalidate: 120, tags: ["vendors"] },
);

export const getVendorStorePageData = unstable_cache(
  async (slug: string) => getVendorStorePageDataImpl(slug),
  ["vendor-store-page"],
  { revalidate: 120, tags: ["vendors", "products"] },
);

export const getProductById = unstable_cache(
  async (id: string) => getProductByIdImpl(id),
  ["product-by-id"],
  { revalidate: 120, tags: ["products"] },
);

export const getProductsByCategoryId = unstable_cache(
  async (categoryId: string) => getProductsByCategoryIdImpl(categoryId),
  ["products-by-category"],
  { revalidate: 120, tags: ["products"] },
);

function productFromSearchRpcRow(row: Record<string, unknown>): Product {
  const vendorName = row.vendor_name;
  const vendorSlug = row.vendor_slug;
  const meta =
    typeof vendorName === "string" && typeof vendorSlug === "string"
      ? { name: vendorName, slug: vendorSlug }
      : null;
  const { vendor_name: _a, vendor_slug: _b, ...rest } = row;
  void _a;
  void _b;
  return mapProduct(
    rest as Parameters<typeof mapProduct>[0],
    meta,
  );
}

export async function searchStorefront(raw: string): Promise<{
  vendors: VendorSummary[];
  products: Product[];
}> {
  const q = raw.trim().slice(0, 80);
  if (!q) {
    return { vendors: [], products: [] };
  }

  if (!isSupabaseServerConfigured) {
    const ql = q.toLowerCase();
    const vendors = [MOCK_VENDOR_ROW].filter(
      (v) =>
        v.name.toLowerCase().includes(ql) ||
        v.slug.toLowerCase().includes(ql),
    );
    const products = fallbackAllProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          (p.brand?.toLowerCase().includes(ql) ?? false),
      )
      .map((p) => ({ ...p, vendorId: DEFAULT_VENDOR_ID }));
    return { vendors, products };
  }

  const pattern = `%${q.replace(/[%_\\]/g, "")}%`;
  if (pattern === "%%") {
    return { vendors: [], products: [] };
  }

  try {
    const supabase = createServerSupabase();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_storefront",
      {
        search_query: q,
        vendor_limit: 20,
        product_limit: 40,
      },
    );

    if (
      !rpcError &&
      rpcData &&
      typeof rpcData === "object" &&
      rpcData !== null &&
      "vendors" in rpcData &&
      "products" in rpcData
    ) {
      const payload = rpcData as {
        vendors: unknown[];
        products: unknown[];
      };
      const vendorRows = Array.isArray(payload.vendors) ? payload.vendors : [];
      const productRows = Array.isArray(payload.products)
        ? payload.products
        : [];
      const vendors = vendorRows.map((r) =>
        mapVendor(r as Parameters<typeof mapVendor>[0]),
      );
      return {
        vendors: await withVendorRatings(supabase, vendors),
        products: productRows.map((r) =>
          productFromSearchRpcRow(r as Record<string, unknown>),
        ),
      };
    }

    const [vName, vSlug, pName, pBrand] = await Promise.all([
      supabase
        .from("vendors")
        .select(VENDOR_LIST_SELECT)
        .eq("is_active", true)
        .ilike("name", pattern)
        .limit(20),
      supabase
        .from("vendors")
        .select(VENDOR_LIST_SELECT)
        .eq("is_active", true)
        .ilike("slug", pattern)
        .limit(20),
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("name", pattern)
        .limit(40),
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("brand", pattern)
        .limit(40),
    ]);

    const vMap = new Map<string, VendorSummary>();
    for (const row of [...(vName.data ?? []), ...(vSlug.data ?? [])]) {
      vMap.set(row.id, mapVendor(row));
    }
    const vendors = [...vMap.values()];

    const productById = new Map<string, ProductRow>();
    for (const r of [...(pName.data ?? []), ...(pBrand.data ?? [])]) {
      if (r) productById.set(r.id, r);
    }
    const productRows = [...productById.values()].slice(0, 40);
    const vendorIds = [
      ...new Set(
        productRows
          .map((r) => r.vendor_id as string | null | undefined)
          .filter(Boolean) as string[],
      ),
    ];
    let vendorMetaById = new Map<string, { name: string; slug: string }>();
    if (vendorIds.length) {
      const { data: vForProducts } = await supabase
        .from("vendors")
        .select("id,name,slug")
        .in("id", vendorIds);
      vendorMetaById = new Map(
        (vForProducts ?? []).map((v) => [
          v.id,
          { name: v.name, slug: v.slug },
        ]),
      );
    }

    const products = productRows.map((r) =>
      mapProduct(r, vendorMetaById.get(r.vendor_id as string) ?? null),
    );
    return { vendors: await withVendorRatings(supabase, vendors), products };
  } catch {
    return { vendors: [], products: [] };
  }
}

export type SearchSuggestVendor = {
  id: string;
  slug: string;
  name: string;
};

export type SearchSuggestProduct = {
  id: string;
  name: string;
  vendor_slug: string;
};

/** اقتراحات خفيفة لشريط البحث (A4.6) — نفس tsvector مع حدود صغيرة + احتياطي ilike. */
export async function searchStorefrontSuggest(raw: string): Promise<{
  vendors: SearchSuggestVendor[];
  products: SearchSuggestProduct[];
}> {
  const q = raw.trim().slice(0, 120);
  if (q.length < 2) {
    return { vendors: [], products: [] };
  }

  if (!isSupabaseServerConfigured) {
    const ql = q.toLowerCase();
    const vendors: SearchSuggestVendor[] =
      MOCK_VENDOR_ROW.name.toLowerCase().includes(ql) ||
      MOCK_VENDOR_ROW.slug.toLowerCase().includes(ql)
        ? [
            {
              id: MOCK_VENDOR_ROW.id,
              slug: MOCK_VENDOR_ROW.slug,
              name: MOCK_VENDOR_ROW.name,
            },
          ]
        : [];
    const products: SearchSuggestProduct[] = fallbackAllProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          (p.brand?.toLowerCase().includes(ql) ?? false),
      )
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        vendor_slug: MOCK_VENDOR_ROW.slug,
      }));
    return { vendors, products };
  }

  const pattern = `%${q.replace(/[%_\\]/g, "")}%`;
  if (pattern === "%%") {
    return { vendors: [], products: [] };
  }

  try {
    const supabase = createServerSupabase();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_storefront_suggest",
      {
        search_query: q,
        vendor_limit: 6,
        product_limit: 6,
      },
    );

    if (
      !rpcError &&
      rpcData &&
      typeof rpcData === "object" &&
      rpcData !== null &&
      "vendors" in rpcData &&
      "products" in rpcData
    ) {
      const payload = rpcData as {
        vendors: unknown[];
        products: unknown[];
      };
      const vendors = (Array.isArray(payload.vendors)
        ? payload.vendors
        : []) as SearchSuggestVendor[];
      const products = (Array.isArray(payload.products)
        ? payload.products
        : []) as SearchSuggestProduct[];
      return { vendors, products };
    }

    const [vName, vSlug, pName, pBrand] = await Promise.all([
      supabase
        .from("vendors")
        .select("id,slug,name")
        .eq("is_active", true)
        .ilike("name", pattern)
        .limit(6),
      supabase
        .from("vendors")
        .select("id,slug,name")
        .eq("is_active", true)
        .ilike("slug", pattern)
        .limit(6),
      supabase
        .from("products")
        .select("id,name,vendor_id")
        .eq("is_active", true)
        .ilike("name", pattern)
        .limit(6),
      supabase
        .from("products")
        .select("id,name,vendor_id")
        .eq("is_active", true)
        .ilike("brand", pattern)
        .limit(6),
    ]);

    const vMap = new Map<string, SearchSuggestVendor>();
    for (const row of [...(vName.data ?? []), ...(vSlug.data ?? [])]) {
      if (row)
        vMap.set(row.id, { id: row.id, slug: row.slug, name: row.name });
    }
    const vendors = [...vMap.values()].slice(0, 6);

    const pById = new Map<
      string,
      { id: string; name: string; vendor_id: string | null }
    >();
    for (const r of [...(pName.data ?? []), ...(pBrand.data ?? [])]) {
      if (r) pById.set(r.id, r);
    }
    const productRows = [...pById.values()]
      .filter((r): r is typeof r & { vendor_id: string } => r.vendor_id != null)
      .slice(0, 6);
    const vendorIds = [...new Set(productRows.map((r) => r.vendor_id))];
    let slugByVendor = new Map<string, string>();
    if (vendorIds.length) {
      const { data: vs } = await supabase
        .from("vendors")
        .select("id,slug")
        .in("id", vendorIds);
      slugByVendor = new Map((vs ?? []).map((v) => [v.id, v.slug]));
    }
    const products: SearchSuggestProduct[] = productRows.map((r) => ({
      id: r.id,
      name: r.name,
      vendor_slug: slugByVendor.get(r.vendor_id) ?? "",
    }));

    return { vendors, products };
  } catch {
    return { vendors: [], products: [] };
  }
}
