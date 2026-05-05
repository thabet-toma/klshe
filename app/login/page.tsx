import LoginForm from "@/app/components/auth/LoginForm";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const nextPath =
    typeof nextRaw === "string" &&
    nextRaw.startsWith("/") &&
    !nextRaw.startsWith("//")
      ? nextRaw
      : "/admin";

  const configured = Boolean(getSupabaseUrl() && getSupabasePublishableKey());

  return (
    <LoginForm
      nextPath={nextPath}
      errorCode={typeof sp.error === "string" ? sp.error : undefined}
      supabaseConfigured={configured}
    />
  );
}
