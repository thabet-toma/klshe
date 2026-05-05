import { NextResponse } from "next/server";
import { searchStorefrontSuggest } from "@/lib/supabase/storefront";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const result = await searchStorefrontSuggest(q);
  return NextResponse.json(result);
}
