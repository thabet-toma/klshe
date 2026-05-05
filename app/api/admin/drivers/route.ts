import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import {
  listDeliveryDriversForAdmin,
} from "@/lib/supabase/delivery-drivers";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  const drivers = await listDeliveryDriversForAdmin();
  return NextResponse.json({ drivers });
}

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Supabase غير مهيأ. أضف المفاتيح في .env.local" },
      { status: 503 },
    );
  }

  let body: {
    id?: string;
    name?: string;
    phone?: string;
    avatar?: string;
    vehicle?: string;
    rating?: number;
    status?: "online" | "busy" | "offline";
    todayOrders?: number;
    earningsToday?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "اسم السائق مطلوب." }, { status: 400 });
  }

  const id =
    body.id?.trim() || `d_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const phone = body.phone?.trim() || "";
  const avatar_url =
    body.avatar?.trim() ||
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80&auto=format&fit=crop";
  const vehicle = body.vehicle?.trim() || "—";
  const rating =
    typeof body.rating === "number" && !Number.isNaN(body.rating)
      ? Math.min(5, Math.max(0, body.rating))
      : 4.5;
  const status = body.status ?? "offline";
  const today_orders =
    typeof body.todayOrders === "number" && body.todayOrders >= 0
      ? Math.floor(body.todayOrders)
      : 0;
  const earnings_today =
    typeof body.earningsToday === "number" && body.earningsToday >= 0
      ? body.earningsToday
      : 0;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("delivery_drivers")
    .insert({
      id,
      name,
      phone,
      avatar_url,
      vehicle,
      rating,
      status,
      today_orders,
      earnings_today,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ driver: data }, { status: 201 });
}
