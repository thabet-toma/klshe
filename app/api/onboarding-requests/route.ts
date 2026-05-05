import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { onboardingRequestSchema, type OnboardingRequestInput } from "@/lib/schemas/signup";

export async function GET() {
  const sb = await createRouteHandlerSupabase();
  if (!sb) return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "platform_admin";

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ requests: [] });
  }
  const svc = createServerSupabase();
  let q = svc
    .from("onboarding_requests")
    .select("id, user_id, requested_role, status, full_name, phone, vendor_name, note, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!isAdmin) q = q.eq("user_id", user.id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const sb = await createRouteHandlerSupabase();
  if (!sb) return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });

  let body: OnboardingRequestInput;
  try {
    const raw = await request.json();
    const parsed = onboardingRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const requestedRole = body.requestedRole;
  if (!requestedRole || !["customer", "vendor_staff", "driver"].includes(requestedRole)) {
    return NextResponse.json({ error: "requestedRole غير صالح." }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }
  const svc = createServerSupabase();

  const { data: existing } = await svc
    .from("onboarding_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("requested_role", requestedRole)
    .eq("status", "pending")
    .maybeSingle();
  if (existing?.id) {
    return NextResponse.json({ error: "لديك طلب قيد المراجعة بالفعل." }, { status: 409 });
  }

  const { data, error } = await svc
    .from("onboarding_requests")
    .insert({
      user_id: user.id,
      requested_role: requestedRole,
      full_name: body.fullName?.trim() || null,
      phone: body.phone?.trim() || null,
      vendor_name: body.vendorName?.trim() || null,
      note: body.note?.trim() || null,
      status: "pending",
    })
    .select("id, requested_role, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data }, { status: 201 });
}
