import { NextResponse } from "next/server";
import { haversineDistanceMeters } from "@/lib/geo/haversine";
import { mapVendor } from "@/lib/supabase/storefront";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

const SELECT_WITH_COORDS =
  "id, slug, name, description, logo_url, banner_url, category_id, vendor_category_id, default_prep_minutes, min_order_amount, delivery_fee_base, location_lat, location_lng" as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(
    24,
    Math.max(1, Number.parseInt(limitRaw ?? "8", 10) || 8),
  );

  const lat = Number.parseFloat(latRaw ?? "");
  const lng = Number.parseFloat(lngRaw ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "معاملات lat و lng مطلوبة وأرقام صالحة." },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "نطاق الإحداثيات غير صالح." }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ vendors: [] });
  }

  try {
    const supabase = createServerSupabase();
    const { data: rows, error } = await supabase
      .from("vendors")
      .select(SELECT_WITH_COORDS)
      .eq("is_active", true)
      .not("location_lat", "is", null)
      .not("location_lng", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sorted = (rows ?? [])
      .map((row) => {
        const d = haversineDistanceMeters(
          lat,
          lng,
          row.location_lat as number,
          row.location_lng as number,
        );
        return {
          ...mapVendor(row),
          distance_m: d,
        };
      })
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))
      .slice(0, limit);

    return NextResponse.json({ vendors: sorted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
