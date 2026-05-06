import { cookies } from "next/headers";

export type FirebaseSession = {
  uid: string;
  profileId: string;
  role: string;
  email: string | undefined;
};

export async function getFirebaseSession(): Promise<FirebaseSession | null> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("fb_uid")?.value;
  const profileId = cookieStore.get("fb_profile_id")?.value;
  const role = cookieStore.get("fb_role")?.value;
  if (!uid || !profileId) return null;
  return { uid, profileId, role: role ?? "customer", email: cookieStore.get("fb_email")?.value };
}

export function getFirebaseSessionFromRequest(
  request: Pick<Request, never> & { cookies: { get: (name: string) => { value: string } | undefined } },
): FirebaseSession | null {
  const uid = request.cookies.get("fb_uid")?.value;
  const profileId = request.cookies.get("fb_profile_id")?.value;
  const role = request.cookies.get("fb_role")?.value;
  if (!uid || !profileId) return null;
  return { uid, profileId, role: role ?? "customer", email: request.cookies.get("fb_email")?.value };
}
