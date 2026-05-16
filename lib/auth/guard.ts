import { NextResponse } from "next/server";
import { getIdentity, verifyRoleFromDb, type Identity } from "./identity";

export type GuardResult =
  | { ok: true; identity: Identity }
  | { ok: false; response: NextResponse };

/**
 * Central identity guard. All protected API routes must call this.
 * Returns 401 if no session, 403 if role doesn't match.
 */
export async function requireIdentity(opts?: {
  roles?: string[];
  verifyDbRole?: boolean;
}): Promise<GuardResult> {
  const identity = await getIdentity();
  if (!identity) {
    return {
      ok: false,
      response: NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 }),
    };
  }

  if (opts?.verifyDbRole) {
    const dbRole = await verifyRoleFromDb(identity.profileId);
    if (!dbRole) {
      return {
        ok: false,
        response: NextResponse.json({ error: "الحساب غير موجود." }, { status: 403 }),
      };
    }
    // Update identity role from DB (source of truth)
    identity.role = dbRole;
  }

  if (opts?.roles && opts.roles.length > 0) {
    if (!opts.roles.includes(identity.role)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "صلاحيات غير كافية." }, { status: 403 }),
      };
    }
  }

  return { ok: true, identity };
}

/** Convenience: returns the guard result or the error response directly. */
export async function guardOrError(opts?: {
  roles?: string[];
  verifyDbRole?: boolean;
}): Promise<Identity | NextResponse> {
  const result = await requireIdentity(opts);
  if (!result.ok) return result.response;
  return result.identity;
}
