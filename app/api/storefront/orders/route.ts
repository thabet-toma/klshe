import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";

export async function GET() {
  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("orders")
    .select("id, short_code, status, total, created_at")
    .eq("customer_id", identity.profileId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
