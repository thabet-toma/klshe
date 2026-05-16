import { getFirebaseSession, type FirebaseSession } from "@/lib/firebase/session";
import { createServerSupabase } from "@/lib/supabase/server";

export type Identity = {
  profileId: string;
  role: string;
  uid: string;
  email: string | undefined;
};

/**
 * Source of truth for identity.
 * Reads Firebase session cookies → returns Identity or null.
 * All API routes must use this instead of reading cookies directly.
 */
export async function getIdentity(): Promise<Identity | null> {
  const session: FirebaseSession | null = await getFirebaseSession();
  if (!session) return null;
  return {
    profileId: session.profileId,
    role: session.role,
    uid: session.uid,
    email: session.email,
  };
}

/**
 * Server-side role verification from Supabase profiles table (source of truth).
 * Does NOT trust fb_role cookie.
 */
export async function verifyRoleFromDb(profileId: string): Promise<string | null> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  return data?.role ?? null;
}
