import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const denied = await assertAdminApi();
  if (denied) return denied;
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "خادم Supabase غير مهيأ." }, { status: 503 });
  }

  let body: { action?: "approve" | "reject" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action غير صالح." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: req, error: rErr } = await supabase
    .from("onboarding_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!req) return NextResponse.json({ error: "غير موجود." }, { status: 404 });

  const newStatus = body.action === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();

  const { error: uErr } = await supabase
    .from("onboarding_requests")
    .update({ status: newStatus, reviewed_at: now, updated_at: now })
    .eq("id", id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  if (body.action === "approve") {
    // ترقية الدور (الجذر): بدونها middleware/الجلسة يبقيان customer فلا تصل اللوحة.
    if (req.requested_role === "driver" || req.requested_role === "vendor_staff") {
      await supabase
        .from("profiles")
        .update({ role: req.requested_role })
        .eq("id", req.user_id);
    }
    if (req.requested_role === "driver") {
      await supabase.from("delivery_drivers").upsert({
        id: req.user_id,
        name: req.full_name ?? "سائق",
        phone: req.phone ?? "",
        avatar_url: "",
        vehicle: "",
        user_id: req.user_id,
        status: "offline",
      });
    } else if (req.requested_role === "vendor_staff" && req.vendor_name) {
      const slug = req.vendor_name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 50);
      const { data: vendor } = await supabase
        .from("vendors")
        .insert({
          slug: `${slug}-${id.slice(0, 6)}`,
          name: req.vendor_name,
          category_id: "cat_grocery",
          vendor_category_id: "vc_grocery",
          is_active: true,
        })
        .select("id")
        .single();
      if (vendor) {
        await supabase.from("vendor_staff").insert({
          vendor_id: vendor.id,
          profile_id: req.user_id,
          staff_role: "owner",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
