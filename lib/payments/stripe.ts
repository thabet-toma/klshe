import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (client) return client;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  client = new Stripe(secret, { apiVersion: "2026-04-22.dahlia" });
  return client;
}
