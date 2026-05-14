import LoginForm from "@/app/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signupSuccess?: string }>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const nextPath =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/admin";

  return (
    <LoginForm
      nextPath={nextPath}
      errorCode={typeof sp.error === "string" ? sp.error : undefined}
      signupPending={sp.signupSuccess === "1"}
    />
  );
}
