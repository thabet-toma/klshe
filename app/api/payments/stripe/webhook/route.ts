import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/payments/stripe";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId) {
      const supabase = createServerSupabase();
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, vendor_id")
        .eq("id", orderId)
        .maybeSingle();
      if (order) {
        await supabase.from("transactions").insert({
          order_id: order.id,
          type: "sale",
          amount: order.total,
          vendor_id: order.vendor_id,
          payment_method: "card",
          note: `Stripe paid session: ${session.id}`,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
