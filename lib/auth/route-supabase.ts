import { getFirebaseSession } from "@/lib/firebase/session";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

/**
 * Compatibility layer: returns a Supabase client (service role) with a patched
 * `.auth.getUser()` that reads from Firebase session cookies instead of
 * Supabase Auth. This lets existing API routes work without changes.
 */
export async function createRouteHandlerSupabase() {
  if (!isSupabaseServerConfigured) return null;

  const session = await getFirebaseSession();
  const supabase = createServerSupabase();

  // Patch auth.getUser to return the Firebase user from cookies
  const originalAuth = supabase.auth;
  supabase.auth = {
    ...originalAuth,
    getUser: async () => {
      if (!session) {
        return { data: { user: null }, error: null } as any;
      }
      return {
        data: {
          user: {
            id: session.profileId,
            email: session.email ?? "",
            role: session.role,
          },
        },
        error: null,
      } as any;
    },
    getSession: async () => {
      if (!session) {
        return { data: { session: null }, error: null } as any;
      }
      return {
        data: {
          session: {
            user: {
              id: session.profileId,
              email: session.email ?? "",
            },
          },
        },
        error: null,
      } as any;
    },
  } as any;

  return supabase;
}
