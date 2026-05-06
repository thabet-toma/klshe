import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
    return NextResponse.json({ error: "رمز Firebase غير صالح." }, { status: 401 });
  }

  // Map Firebase UID to a valid UUID for Supabase
  const profileId = firebaseUidToUuid(uid);

  const supabase = createServerSupabase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();

  let role = existing?.role ?? "customer";

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: profileId,
      full_name: displayName ?? null,
      role: "customer",
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
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
