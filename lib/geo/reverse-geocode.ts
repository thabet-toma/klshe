/**
 * Lightweight reverse-geocoding helpers used across storefront UI to convert
 * raw lat/lng pairs into a human-friendly location label (city / district).
 *
 * Two strategies are supported:
 *   1. Mapbox Geocoding API when `NEXT_PUBLIC_MAPBOX_TOKEN` is exposed.
 *   2. Free OpenStreetMap Nominatim fallback (no token required) — rate
 *      limited but adequate for occasional client-side requests.
 */

export type ReverseGeocodeResult = {
  label: string;
  city?: string | null;
  region?: string | null;
};

const MAPBOX_TOKEN =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
    : "";

export async function reverseGeocode(
  lat: number,
  lng: number,
  language = "ar",
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (MAPBOX_TOKEN) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=${encodeURIComponent(
        language,
      )}&types=place,locality,neighborhood,address&limit=1&access_token=${encodeURIComponent(
        MAPBOX_TOKEN,
      )}`;
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as {
          features?: Array<{
            text?: string;
            place_name?: string;
            context?: Array<{ id?: string; text?: string }>;
          }>;
        };
        const f = data.features?.[0];
        if (f) {
          const region = f.context?.find((c) =>
            c.id?.startsWith("region"),
          )?.text;
          return {
            label: f.place_name || f.text || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            city: f.text ?? null,
            region: region ?? null,
          };
        }
      }
    } catch {
      /* fall through to OSM */
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lng))}&accept-language=${encodeURIComponent(language)}`;
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "JetekApp/1.0" },
    });
    if (r.ok) {
      const data = (await r.json()) as {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          suburb?: string;
          state?: string;
          country?: string;
        };
      };
      const a = data.address ?? {};
      const city = a.city || a.town || a.village || a.suburb || null;
      const region = a.state || a.country || null;
      const label =
        [city, region].filter(Boolean).join("، ") ||
        data.display_name ||
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return { label, city, region };
    }
  } catch {
    /* ignore */
  }

  return {
    label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    city: null,
    region: null,
  };
}

export type StoredUserLocation = {
  label: string;
  lat?: number;
  lng?: number;
  setAt?: number;
};

const KEY = "jetek-location";

export function readStoredLocation(): StoredUserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUserLocation;
  } catch {
    return null;
  }
}

export function writeStoredLocation(value: StoredUserLocation): void {
  if (typeof window === "undefined") return;
  const payload: StoredUserLocation = { ...value, setAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(
    new CustomEvent("jetek:location-changed", { detail: payload }),
  );
}
