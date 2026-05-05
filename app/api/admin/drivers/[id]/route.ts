import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import type { Database } from "@/lib/supabase/types";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

type DriverUpdate = Database["public"]["Tables"]["delivery_drivers"]["Update"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Supabase غير مهيأ. أضف المفاتيح في .env.local" },
      { status: 503 },
    );
  }

  const { id } = await params;

  let body: {
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

  const patch: DriverUpdate = {};

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json({ error: "الاسم لا يمكن أن يكون فارغاً." }, { status: 400 });
    }
    patch.name = n;
  }
  if (body.phone !== undefined) patch.phone = body.phone.trim();
  if (body.avatar !== undefined) patch.avatar_url = body.avatar.trim();
  if (body.vehicle !== undefined) patch.vehicle = body.vehicle.trim();
  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (Number.isNaN(r)) {
      return NextResponse.json({ error: "التقييم غير صالح." }, { status: 400 });
    }
    patch.rating = Math.min(5, Math.max(0, r));
  }
  if (body.status !== undefined) patch.status = body.status;
  if (body.todayOrders !== undefined) {
    const t = Math.floor(Number(body.todayOrders));
    if (Number.isNaN(t) || t < 0) {
      return NextResponse.json({ error: "طلبات اليوم غير صالحة." }, { status: 400 });
    }
    patch.today_orders = t;
  }
  if (body.earningsToday !== undefined) {
    const e = Number(body.earningsToday);
    if (Number.isNaN(e) || e < 0) {
      return NextResponse.json({ error: "أرباح اليوم غير صالحة." }, { status: 400 });
    }
    patch.earnings_today = e;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا يوجد حقل للتحديث." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("delivery_drivers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "السائق غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ driver: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Supabase غير مهيأ. أضف المفاتيح في .env.local" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const supabase = createServerSupabase();
  const { error } = await supabase.from("delivery_drivers").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
