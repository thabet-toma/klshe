import { cookies } from "next/headers";

export type FirebaseSession = {
  uid: string;
  role: string;
  email: string | undefined;
};

/** قراءة بيانات الجلسة من الكوكيز (server-side فقط). */
export async function getFirebaseSession(): Promise<FirebaseSession | null> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("fb_uid")?.value;
  const role = cookieStore.get("fb_role")?.value;
  if (!uid) return null;
  return { uid, role: role ?? "customer", email: cookieStore.get("fb_email")?.value };
}

/** نفس الوظيفة لكن من NextRequest (Edge middleware). */
export function getFirebaseSessionFromRequest(
  request: Pick<Request, never> & { cookies: { get: (name: string) => { value: string } | undefined } },
): FirebaseSession | null {
  const uid = request.cookies.get("fb_uid")?.value;
  const role = request.cookies.get("fb_role")?.value;
  if (!uid) return null;
  return { uid, role: role ?? "customer", email: request.cookies.get("fb_email")?.value };
}
