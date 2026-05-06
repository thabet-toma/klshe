import { NextResponse } from "next/server";
import { getFirebaseSession } from "@/lib/firebase/session";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export async function requirePlatformAdmin(): Promise<{
  error: NextResponse | null;
  userId: string | null;
}> {
  const session = await getFirebaseSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 }),
      userId: null,
    };
  }

  if (session.role !== "platform_admin") {
    return {
      error: NextResponse.json({ error: "صلاحيات غير كافية." }, { status: 403 }),
      userId: null,
    };
  }

  return { error: null, userId: session.uid };
}

export function skipAdminAuthBecauseDemo(): boolean {
  return !isFirebaseAdminConfigured;
}

export async function assertAdminApi(): Promise<NextResponse | null> {
  if (skipAdminAuthBecauseDemo()) return null;
  const { error } = await requirePlatformAdmin();
  return error;
}
