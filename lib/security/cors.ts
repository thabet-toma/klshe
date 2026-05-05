import { NextResponse } from "next/server";

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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
