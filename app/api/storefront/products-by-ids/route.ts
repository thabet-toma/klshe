import { NextResponse } from "next/server";
import { allProducts } from "@/lib/data";
import { mapProduct } from "@/lib/supabase/storefront";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids");
  if (!raw) {
    return NextResponse.json({ products: [] });
  }

  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(
    0,
    50,
  );
  if (!ids.length) {
    return NextResponse.json({ products: [] });
  }

  if (!isSupabaseServerConfigured) {
    const products = ids
      .map((id) => {
        const p = allProducts.find((x) => x.id === id);
        return p ? { ...p, vendorId: DEFAULT_VENDOR_ID } : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    return NextResponse.json({ products });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: (data ?? []).map((r) => mapProduct(r)),
  });
}
