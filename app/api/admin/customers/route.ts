import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  debt: number;
};

const COUNTED_STATUSES = new Set(["cancelled", "rejected"]);

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ customers: [] });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("customer_name, customer_phone, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byPhone = new Map<string, CustomerRow>();
  for (const o of data ?? []) {
    const phone = (o.customer_phone ?? "").trim();
    const key = phone || (o.customer_name ?? "").trim();
    if (!key) continue;
    const existing = byPhone.get(key);
    const isVoid = COUNTED_STATUSES.has(o.status ?? "");
    const spent = o.status === "delivered" ? Number(o.total ?? 0) : 0;
    if (existing) {
      if (!isVoid) existing.totalOrders += 1;
      existing.totalSpent += spent;
    } else {
      byPhone.set(key, {
        id: key,
        name: (o.customer_name ?? "زبون").trim() || "زبون",
        phone,
        totalOrders: isVoid ? 0 : 1,
        totalSpent: spent,
        debt: 0,
      });
    }
  }

  const customers = [...byPhone.values()].sort((a, b) => b.totalSpent - a.totalSpent);
  return NextResponse.json({ customers });
}
