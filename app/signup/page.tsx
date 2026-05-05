import SignupForm from "@/app/components/auth/SignupForm";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export default function SignupPage() {
  const configured = Boolean(getSupabaseUrl() && getSupabasePublishableKey());
  return <SignupForm supabaseConfigured={configured} />;
}
