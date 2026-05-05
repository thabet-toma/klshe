import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ requests: [] });
  }
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("status") ?? "pending";
  const status: "pending" | "approved" | "rejected" =
    raw === "approved" || raw === "rejected" ? raw : "pending";
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("onboarding_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}
