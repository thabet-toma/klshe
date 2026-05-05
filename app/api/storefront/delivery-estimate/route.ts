import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";

const DEFAULT_BASE_AGOROT = 2000;
const DEFAULT_PER_KM_AGOROT = 300;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ distanceKm: null, deliveryFeeAgorot: DEFAULT_BASE_AGOROT });
  }

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId") || DEFAULT_VENDOR_ID;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng مطلوبان." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, location_lat, location_lng, delivery_fee_base")
    .eq("id", vendorId)
    .maybeSingle();

  const vendorLat = vendor?.location_lat;
  const vendorLng = vendor?.location_lng;
  const base = Math.max(0, Math.round(vendor?.delivery_fee_base ?? DEFAULT_BASE_AGOROT));
  if (vendorLat == null || vendorLng == null) {
    return NextResponse.json({ distanceKm: null, deliveryFeeAgorot: base });
  }

  let distanceKm = haversineKm(vendorLat, vendorLng, lat, lng);

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${vendorLng},${vendorLat};${lng},${lat}` +
        `?alternatives=false&geometries=geojson&overview=false&access_token=${encodeURIComponent(mapboxToken)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { routes?: { distance?: number }[] };
        const meters = j.routes?.[0]?.distance;
        if (typeof meters === "number" && meters > 0) distanceKm = meters / 1000;
      }
    } catch {
      // fallback to haversine
    }
  }

  const deliveryFeeAgorot = base + Math.round(distanceKm * DEFAULT_PER_KM_AGOROT);
  return NextResponse.json({
    distanceKm: Number(distanceKm.toFixed(2)),
    deliveryFeeAgorot,
  });
}
