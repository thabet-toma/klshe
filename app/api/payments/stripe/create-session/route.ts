import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { guardOrError } from "@/lib/auth/guard";
import { agorotToShekel } from "@/lib/currency/agorot";
import { getStripeClient } from "@/lib/payments/stripe";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    key: `stripe-session:${ip}`,
    limit: 10,
    windowMs: 60_000,
    windowLabel: "1 m",
  });
  if (!rl.success) {
    return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً." }, { status: 429 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const identity = await guardOrError();
  if (identity instanceof NextResponse) return identity;

  let body: { orderId?: string };
  try {
    body = (await request.json()) as { orderId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) return NextResponse.json({ error: "orderId is required." }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("id, short_code, total, customer_id")
    .eq("id", orderId)
    .eq("customer_id", identity.profileId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${baseUrl}/orders/${order.id}?paid=1`,
    cancel_url: `${baseUrl}/checkout?payment_cancelled=1`,
    metadata: { order_id: order.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "ils",
          unit_amount: order.total,
          product_data: {
            name: `Order ${order.short_code}`,
            description: "Jetek order payment",
          },
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url, id: session.id, amountIls: agorotToShekel(order.total) });
}
