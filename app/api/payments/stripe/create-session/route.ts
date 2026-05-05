import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { createServerSupabase } from "@/lib/supabase/server";
import { agorotToShekel } from "@/lib/currency/agorot";
import { getStripeClient } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const supabaseAuth = await createRouteHandlerSupabase();
  if (!supabaseAuth) {
    return NextResponse.json({ error: "الخدمة غير مهيأة." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });

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
    .eq("customer_id", user.id)
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
