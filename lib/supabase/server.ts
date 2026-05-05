import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

const url = getSupabaseUrl();
const secretKey = getSupabaseSecretKey();

export const isSupabaseServerConfigured = Boolean(url && secretKey);

export function createServerSupabase() {
  if (!url || !secretKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
