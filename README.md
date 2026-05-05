This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Currency Convention (Important)

- All money values in database tables are stored as **agorot** (`bigint`), not decimal shekel.
- UI displays shekel using `formatPrice(...)` from `lib/currency.ts`.
- Product create/update APIs accept:
  - `price` / `oldPrice` in shekel decimal (legacy/front-form friendly), or
  - `priceAgorot` / `oldPriceAgorot` as integer agorot (preferred).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Production Supabase Runbook

### 1) Env Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key)
- `SUPABASE_SECRET_KEY` (server only)
- `MAPBOX_ACCESS_TOKEN` (for delivery distance by Directions API)
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (error reporting)
- `SENTRY_ORG` + `SENTRY_PROJECT` (source map upload during build)

Do not expose server keys in client bundles. Keep `SUPABASE_SECRET_KEY` only on server/runtime env.

### 1.1) Sentry

- Sentry is initialized through `instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation-client.ts`.
- PII is masked by default (`sendDefaultPii: false`) and request/user sensitive fields are stripped in `beforeSend`.
- Source maps are uploaded via `withSentryConfig(...)` in `next.config.ts` when org/project env vars are set.

### 1.2) PostHog

- Set `NEXT_PUBLIC_POSTHOG_KEY` and optional `NEXT_PUBLIC_POSTHOG_HOST`.
- Captured events: `pageview`, `cart_add`, `checkout_step`, `order_placed`, `delivered`.
- Feature flags are loaded client-side and emitted as `feature_flags_loaded`.

### 1.3) Stripe Payments (D8.1)

- Required envs:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- API endpoints:
  - `POST /api/payments/stripe/create-session` creates Stripe Checkout session for an existing order.
  - `POST /api/payments/stripe/webhook` verifies Stripe signature and records successful card payment transaction.
- Checkout behavior:
  - If payment method is `card`, checkout creates the order first, then redirects user to Stripe Checkout URL.

### 2) Database Migrations

Apply all SQL files in `supabase/` in order, including:

- multi-vendor/auth + schema_pro + agorot currency migrations
- finance core + delivered-order RPC/trigger
- onboarding requests
- ratings

After applying, verify tables/policies:

- `orders`, `order_items`, `addresses`, `vendor_staff`, `vendors`, `delivery_drivers`
- `vendor_balances`, `payouts`, `sales_invoices`, `platform_settings`
- `ratings`, `onboarding_requests`

### 3) RLS Checklist

- RLS enabled on all user-facing tables.
- Policies validated for customer/vendor/driver/platform_admin scopes.
- Test each role with a real JWT (not service role) against:
  - orders read/write boundaries
  - addresses ownership
  - vendor payouts/balances visibility
  - ratings ownership and vendor/admin read paths

### 4) Storage Buckets

Create and configure bucket:

- `vendor-assets` (public read if you serve public URLs directly)

Validate upload flows:

- vendor upload route: `/api/vendor/upload-asset`
- admin upload route: `/api/admin/upload-asset`

### 5) Backups

- Enable scheduled Postgres backups in Supabase project settings.
- Keep at least daily backups and retention per your compliance needs.
- Test one restore path periodically (staging or disposable environment).

### 6) Rate Limits

Recommended to enforce on API edge/server:

- `/api/orders`
- `/api/auth/*`
- `/api/storefront/products-by-ids` (if enabled in your deployment)

Use Redis/Upstash-backed limits in production to avoid in-memory reset issues.

### 7) Security & Operations

- Rotate keys periodically and after any suspected leak.
- Keep audit logs enabled for auth/admin actions.
- Verify CORS allowlist for production domains only.
- Run smoke tests after deployment: signup/login, checkout, order tracking, driver lifecycle, admin product update/upload.

### 7.1) Production Domain & Auth Callbacks (D8.2)

Set the canonical production domain (example: `https://jetek.app`).

DNS records (point your registrar at Vercel):

- Apex `jetek.app` → `A` record → `76.76.21.21`
- `www.jetek.app` → `CNAME` record → `cname.vercel-dns.com`
- TLS certificate is managed automatically by Vercel after DNS propagation.

Vercel project setup:

- Settings → Domains: add `jetek.app` and `www.jetek.app`
- Set redirect: `www → apex` (or vice versa)
- Settings → Environment Variables (Production):
  - `NEXT_PUBLIC_APP_URL=https://jetek.app`
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`
  - `SUPABASE_SECRET_KEY=...`
  - `MAPBOX_ACCESS_TOKEN=...`
  - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `CORS_ALLOWLIST=https://jetek.app,https://www.jetek.app`

Supabase auth redirects:

- Project → Authentication → URL Configuration:
  - **Site URL**: `https://jetek.app`
  - **Additional Redirect URLs** (one per line):
    - `https://jetek.app/auth/callback`
    - `https://www.jetek.app/auth/callback`
    - `http://localhost:3000/auth/callback` (dev)
- Email templates: replace any hardcoded `localhost` link with `{{ .SiteURL }}`.

Stripe production setup:

- Switch to **Live mode**.
- Configure webhook endpoint: `https://jetek.app/api/payments/stripe/webhook`
- Subscribe to event: `checkout.session.completed` (and any others you care about).
- Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Post-deploy smoke tests (production):

1. `https://jetek.app/` returns 200 with locale redirect (e.g. `/ar`).
2. `/login` flow works with email/phone OTP using production Supabase project.
3. Place test order with cash → tracked under `/orders/[id]`.
4. Place test order with Stripe (test card) → redirected to Stripe → webhook fires → transaction recorded.
5. `robots.txt`, `manifest.webmanifest`, and `sw.js` resolve at the root domain.
6. Sentry DSN receives a synthetic error from the deployed bundle.
7. PostHog `pageview` event appears in production project.

### 8) Supabase JWT Role Hook (A2.3)

Configure custom role claims in Supabase so RLS can read role from JWT.

1) Create SQL function in Supabase SQL editor:

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  claims := coalesce(event->'claims', '{}'::jsonb);

  select role
  into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  if user_role is null then
    user_role := 'customer';
  end if;

  return jsonb_set(
    event,
    '{claims}',
    claims || jsonb_build_object('role', user_role)
  );
end;
$$;
```

2) In Supabase Dashboard:
- Go to **Authentication → Hooks**
- Enable **Custom Access Token Hook**
- Select `public.custom_access_token_hook`
- Save and deploy

3) Verify role claim is present in JWT:
- Sign in normally from app (`/login`)
- Copy `sb-access-token` from browser storage/cookies
- Decode token payload at [jwt.io](https://jwt.io) and confirm:
  - `role` exists (e.g. `customer`, `vendor_staff`, `driver`, `platform_admin`)

4) Quick SQL verification:
- Open SQL editor and run role-gated query with authenticated user token in API client.
- Confirm policies depending on role now pass/fail correctly by changing `profiles.role`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
