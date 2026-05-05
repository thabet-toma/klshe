import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

const url = getSupabaseUrl();
const publishableKey = getSupabasePublishableKey();

export const isSupabaseConfigured = Boolean(url && publishableKey);

export function createBrowserSupabase() {
  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createBrowserClient<Database>(url, publishableKey);
}