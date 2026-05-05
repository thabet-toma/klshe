const DEFAULT_UNSPLASH_PARAMS = "auto=format&fit=crop&q=80";

export function transformImageUrl(url: string, width = 800): string {
  const raw = url.trim();
  if (!raw) return raw;

  try {
    const u = new URL(raw);
    if (u.hostname === "images.unsplash.com" || u.hostname === "plus.unsplash.com") {
      if (!u.searchParams.has("w")) {
        u.searchParams.set("w", String(width));
      }
      if (!u.searchParams.has("auto")) {
        u.searchParams.set("auto", "format");
      }
      if (!u.searchParams.has("fit")) {
        u.searchParams.set("fit", "crop");
      }
      if (!u.searchParams.has("q")) {
        u.searchParams.set("q", "80");
      }
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

export { DEFAULT_UNSPLASH_PARAMS };
