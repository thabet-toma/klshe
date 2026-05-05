import webpush from "web-push";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:support@example.com";

let configured = false;
function ensureConfigured() {
  if (configured) return Boolean(publicKey && privateKey);
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return publicKey ?? null;
}

export async function sendOrderStatusPush(orderId: string, status: string) {
  if (!isSupabaseServerConfigured) return;
  if (!ensureConfigured()) return;

  const supabase = createServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("id, short_code, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order?.customer_id) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", order.customer_id);
  if (!subs?.length) return;

  const payload = JSON.stringify({
    title: "تحديث حالة الطلب",
    body: `حالة طلبك ${order.short_code} أصبحت: ${status}`,
    url: `/orders/${order.id}`,
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        );
      } catch {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
}
