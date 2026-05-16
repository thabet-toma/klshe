import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/payments/stripe";
import { log } from "@/lib/log";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  // (a) Reject stale events (> 5 minutes old)
  if (Date.now() / 1000 - event.created > 300) {
    log.warn("stripe_webhook_stale_event", { event_id: event.id, type: event.type, created: event.created });
    return NextResponse.json({ error: "Event too old." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const stripeSessionId = session.id;

    if (orderId) {
      const supabase = createServerSupabase();

      // (b) Idempotency: check for existing transaction with same stripe_session_id
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("order_id", orderId)
        .eq("stripe_session_id", stripeSessionId)
        .maybeSingle();

      if (existingTx) {
        // Already processed — return 200 to avoid Stripe retries
        log.info("stripe_webhook_dedup", { order_id: orderId, session_id: stripeSessionId });
        return NextResponse.json({ received: true, deduplicated: true });
      }

      // (c) Update order and insert transaction atomically
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, vendor_id")
        .eq("id", orderId)
        .maybeSingle();

      if (order) {
        const now = new Date().toISOString();
        await supabase.from("transactions").insert({
          order_id: order.id,
          type: "sale",
          amount: order.total,
          vendor_id: order.vendor_id,
          payment_method: "card",
          stripe_session_id: stripeSessionId,
          note: `Stripe paid session: ${session.id}`,
        });

        // Broadcast the order now that payment is confirmed
        await supabase
          .from("orders")
          .update({
            status: "broadcast",
            broadcast_at: now,
            accepted_at: now,
          })
          .eq("id", order.id)
          .eq("status", "new");

        log.info("stripe_payment_confirmed", { order_id: order.id, amount: order.total, session_id: stripeSessionId });
      }
    }
  }

  return NextResponse.json({ received: true });
}
