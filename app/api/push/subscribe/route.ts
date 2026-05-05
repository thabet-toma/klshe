import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { getVapidPublicKey } from "@/lib/push/web-push";

type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function GET() {
  return NextResponse.json({ vapidPublicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  const supabase = await createRouteHandlerSupabase();
  if (!supabase) return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });

  let body: SubBody;
  try {
    body = (await request.json()) as SubBody;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "subscription غير صالح." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createRouteHandlerSupabase();
  if (!supabase) return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }
  const endpoint = body.endpoint?.trim();
  if (!endpoint) return NextResponse.json({ error: "endpoint مطلوب." }, { status: 400 });

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
