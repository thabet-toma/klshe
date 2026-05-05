import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/** عميل Supabase مع كوكي الجلسة — للمسارات التي تعتمد على RLS + JWT الزائر. */
export async function createRouteHandlerSupabase(): Promise<
  SupabaseClient<Database> | null
> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component قد يمنع set في بعض السياقات */
        }
      },
    },
  });
}
