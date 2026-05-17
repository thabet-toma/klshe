import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireIdentity } from "@/lib/auth/guard";
import { log } from "@/lib/log";

// T2.1: انتحال أدمن→سائق للاختبار. لا تغيير دور دائم — صفّ delivery_drivers
// مؤقّت (is_temp) بـ user_id = profileId للأدمن. DELETE يعكسه.

export async function POST() {
  const guard = await requireIdentity({ roles: ["platform_admin"], verifyDbRole: true });
  if (!guard.ok) return guard.response;
  const { identity } = guard;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }
  const supabase = createServerSupabase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("delivery_drivers")
    .select("id, is_temp")
    .eq("user_id", identity.profileId)
    .maybeSingle();

  if (existing?.id && existing.is_temp === false) {
    return NextResponse.json({
      ok: true,
      driverId: existing.id,
      redirect: "/driver",
      message: "حسابك سائق فعلي بالفعل — لا حاجة لوضع التجربة.",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("delivery_drivers")
    .upsert(
      {
        id: identity.profileId,
        user_id: identity.profileId,
        name: "تجربة المدير",
        phone: "",
        avatar_url: "",
        vehicle: "",
        status: "online",
        is_temp: true,
      },
      { onConflict: "id" },
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  log.info("admin_impersonate_driver_start", {
    admin_profile_id: identity.profileId,
    driver_id: data.id,
  });

  return NextResponse.json({ ok: true, driverId: data.id, redirect: "/driver" });
}

export async function DELETE() {
  const guard = await requireIdentity({ roles: ["platform_admin"], verifyDbRole: true });
  if (!guard.ok) return guard.response;
  const { identity } = guard;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }
  const supabase = createServerSupabase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from("delivery_drivers")
    .select("id")
    .eq("user_id", identity.profileId)
    .eq("is_temp", true)
    .maybeSingle();

  if (!row?.id) {
    return NextResponse.json({ ok: true, message: "لا يوجد سائق تجريبي نشط." });
  }

  const { error: delErr } = await supabase
    .from("delivery_drivers")
    .delete()
    .eq("id", row.id);

  if (delErr) {
    // الصفّ مرتبط بطلبات (FK) — لا نُتلف سجلّ الطلبات؛ نُلغي ربط الأدمن فقط.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await (supabase as any)
      .from("delivery_drivers")
      .update({ status: "offline", user_id: null })
      .eq("id", row.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  log.info("admin_impersonate_driver_stop", {
    admin_profile_id: identity.profileId,
    driver_id: row.id,
    deleted: !delErr,
  });

  return NextResponse.json({ ok: true });
}
