import { NextResponse } from "next/server";

let _cached: string[] | null = null;
let _logged = false;

function parseAllowedOrigins(): string[] {
  if (_cached) return _cached;
  const raw = process.env.CORS_ALLOWLIST ?? "";
  _cached = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!_logged) {
    _logged = true;
    if (_cached.length === 0) {
      console.warn("[CORS] CORS_ALLOWLIST is empty — all origins will receive Access-Control-Allow-Origin: null");
    } else {
      console.log("[CORS] Allowed origins:", _cached.join(", "));
    }
  }
  return _cached;
}

export function corsHeaders(origin: string | null) {
  const allowed = parseAllowedOrigins();
  const isAllowed = origin != null && allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "null",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function optionsCorsResponse(origin: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
