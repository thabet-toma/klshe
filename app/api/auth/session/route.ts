import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { log } from "@/lib/log";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const SERVICE_UNAVAILABLE_MSG = "الخدمة غير متاحة مؤقتاً. حاول مجدداً بعد قليل.";

/** A supabase-js error caused by the DB being unreachable (e.g. project paused) surfaces as a raw fetch failure. */
function isConnectivityError(err: { message?: string } | null | undefined): boolean {
  const m = err?.message ?? "";
  return /fetch failed|failed to fetch|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(m);
}

/** Convert a Firebase UID (alphanumeric) to a deterministic UUID v5-like string. */
function firebaseUidToUuid(uid: string): string {
  const hash = createHash("sha1").update("firebase:" + uid).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0") + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");
}

// POST /api/auth/session — verify Firebase ID token, sync Supabase profile, set session cookies
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    key: `auth-session:${ip}`,
    limit: 20,
    windowMs: 60_000,
    windowLabel: "1 m",
  });
  if (!rl.success) {
    return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً." }, { status: 429 });
  }

  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin غير مهيأ." }, { status: 503 });
  }

  let idToken: string;
  try {
    const body = await request.json();
    idToken = body.idToken;
    if (!idToken) throw new Error("missing idToken");
  } catch {
    return NextResponse.json({ error: "يجب إرسال idToken." }, { status: 400 });
  }

  let uid: string;
  let email: string | undefined;
  let displayName: string | undefined;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
    displayName = decoded.name;
  } catch {
    log.warn("auth_invalid_token", { ip: request.headers.get("x-forwarded-for") ?? "unknown" });
    return NextResponse.json({ error: "رمز Firebase غير صالح." }, { status: 401 });
  }

  // Map Firebase UID to a valid UUID for Supabase
  const profileId = firebaseUidToUuid(uid);

  const supabase = createServerSupabase();
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();

  if (selectError) {
    if (isConnectivityError(selectError)) {
      log.warn("auth_db_unreachable", { stage: "select", message: selectError.message });
      return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
    }
    log.error("auth_profile_select_failed", { message: selectError.message });
    return NextResponse.json({ error: "تعذّر إكمال تسجيل الدخول." }, { status: 500 });
  }

  const role = existing?.role ?? "customer";

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: profileId,
      full_name: displayName ?? null,
      role: "customer",
    });
    if (insertError) {
      if (isConnectivityError(insertError)) {
        log.warn("auth_db_unreachable", { stage: "insert", message: insertError.message });
        return NextResponse.json({ error: SERVICE_UNAVAILABLE_MSG }, { status: 503 });
      }
      log.error("auth_profile_insert_failed", { message: insertError.message });
      return NextResponse.json({ error: "تعذّر إكمال تسجيل الدخول." }, { status: 500 });
    }
  }

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };

  // Store both the Firebase UID (for auth) and the profile UUID (for DB queries)
  cookieStore.set("fb_uid", uid, cookieOpts);
  cookieStore.set("fb_profile_id", profileId, cookieOpts);
  cookieStore.set("fb_role", role, cookieOpts);
  if (email) cookieStore.set("fb_email", email, cookieOpts);

  log.info("auth_session_created", { profile_id: profileId, role });

  return NextResponse.json({ ok: true, role });
}

// DELETE /api/auth/session — clear session cookies
export async function DELETE() {
  const cookieStore = await cookies();
  const clear = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };
  cookieStore.set("fb_uid", "", clear);
  cookieStore.set("fb_profile_id", "", clear);
  cookieStore.set("fb_role", "", clear);
  cookieStore.set("fb_email", "", clear);
  return NextResponse.json({ ok: true });
}
