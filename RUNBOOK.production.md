# Production Runbook — Jetek (D8.2)

This runbook is the canonical procedure for taking the project from a fresh Vercel project to a fully working production domain with auth, payments, push, analytics, error reporting and monitoring.

> Replace `jetek.app` with your real domain everywhere below.

---

## 0) Prerequisites

- Vercel account + GitHub repo connected.
- Supabase **production** project (separate from dev).
- Stripe account in **Live** mode (only after compliance review).
- Domain registrar access (for DNS records).
- Upstash Redis (rate limit) production DB.
- PostHog production project, Sentry production project.

---

## 1) DNS & Domain

### 1.1 Add DNS records at your registrar

| Type  | Host          | Value                  | TTL   |
|-------|---------------|------------------------|-------|
| A     | `@`           | `76.76.21.21`          | 3600  |
| CNAME | `www`         | `cname.vercel-dns.com` | 3600  |

> If your registrar requires a value for the apex CNAME instead of A, use ALIAS/ANAME → `cname.vercel-dns.com`.

### 1.2 Add domain in Vercel

- Vercel → Project → Settings → Domains:
  - Add `jetek.app` → mark as **Primary**.
  - Add `www.jetek.app` → set redirect to apex (handled also by `vercel.json` as backup).
- Wait until both domains show **Valid Configuration** and TLS certificate is issued.

---

## 2) Vercel Project Configuration

### 2.1 Build & runtime

- Framework preset: **Next.js**.
- Node.js version: 20 (or whatever matches `package.json` engines if set).
- Install command: `npm ci`
- Build command: `npm run build`
- Output: default (Next.js).

### 2.2 Environment variables (Production scope)

Copy the following into Vercel → Settings → Environment Variables (Production).
Mark `*_SECRET*`/`SUPABASE_SECRET_KEY`/`STRIPE_SECRET_KEY`/`VAPID_PRIVATE_KEY` as **Encrypted**.

```
NEXT_PUBLIC_APP_URL=https://jetek.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<prod-anon>
SUPABASE_SECRET_KEY=<prod-service-role>

# Maps
MAPBOX_ACCESS_TOKEN=<mapbox-prod-token>

# Sentry
SENTRY_DSN=<server-dsn>
NEXT_PUBLIC_SENTRY_DSN=<browser-dsn>
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=<project-slug>

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=<ph-prod-key>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
VAPID_SUBJECT=mailto:ops@jetek.app

# Rate limit
UPSTASH_REDIS_REST_URL=https://<prod-redis>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<prod-token>

# CORS
CORS_ALLOWLIST=https://jetek.app,https://www.jetek.app
```

After saving, redeploy from `main`.

### 2.3 Headers

`vercel.json` already configures HSTS, X-Frame-Options, Permissions-Policy, and proper SW cache control. Verify after deploy:

```
curl -I https://jetek.app/
curl -I https://jetek.app/sw.js
```

---

## 3) Supabase Production

### 3.1 Auth → URL Configuration

- **Site URL**: `https://jetek.app`
- **Additional Redirect URLs**:
  - `https://jetek.app/auth/callback`
  - `https://www.jetek.app/auth/callback`
  - `http://localhost:3000/auth/callback` (dev convenience)

### 3.2 Email templates

Replace any literal `localhost:3000` link with the templated value `{{ .SiteURL }}` or `{{ .ConfirmationURL }}`.

### 3.3 Custom Access Token Hook

Apply the SQL function `public.custom_access_token_hook` (see README §8) and enable it in Auth → Hooks → Custom Access Token Hook.

### 3.4 RLS sanity

- Confirm all migrations from `supabase/` have been applied to the **production** project.
- In particular, **migration_019_vendor_workspace_extras.sql** must run; it adds:
  - `vendors.commission_rate`, `vendors.is_open`, `vendors.delivery_fee_per_km`, `vendors.address_text`
  - `vendor_inventory`, `vendor_suppliers`, `vendor_customers`,
    `vendor_customer_transactions`, `vendor_sales_invoices`,
    `vendor_sales_invoice_items`, `vendor_purchase_invoices`,
    `vendor_purchase_invoice_items`, `platform_settings` (with RLS).
- Run a smoke RLS test for each role (customer / vendor_staff / driver / platform_admin).

### 3.5 Storage bucket

- Create `vendor-assets` (public-read).
- Validate vendor and admin upload routes return 200 from production.

### 3.6 Backups

- Database → Backups → enable daily backups, retain ≥ 7 days.

---

## 4) Stripe

1. Switch dashboard to **Live mode**.
2. Developers → Webhooks → Add endpoint:
   - URL: `https://jetek.app/api/payments/stripe/webhook`
   - Events: `checkout.session.completed` (add others later as needed).
3. Copy signing secret → set as `STRIPE_WEBHOOK_SECRET` in Vercel.
4. Use a real card with `Test mode` first via a separate Vercel preview pointing to test keys to validate the redirect/return loop, then promote live keys.

---

## 5) Web Push

1. Generate VAPID keys (one time):
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in Vercel.
3. After deploy, visit `/account` → enable notifications → confirm a subscription row in `push_subscriptions`.

---

## 6) Sentry

- Create production org/project, get DSNs.
- Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- After deploy, trigger a test error from a debug page (or run `Sentry.captureMessage("smoke")` in console) and confirm event arrives within 60s.
- Confirm uploaded source maps (Sentry → Releases → latest) include `.js.map` artifacts.

---

## 7) PostHog

- Create production project; copy key.
- Set `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
- After deploy, navigate the storefront and verify `pageview`, `cart_add`, `checkout_step`, `order_placed`, `delivered` events flow.

---

## 8) Smoke Test Checklist (post-deploy)

- [ ] `https://jetek.app/` loads, redirects to a locale (e.g. `/ar`).
- [ ] `/login` OTP works (email + phone).
- [ ] `/signup` flows: customer / vendor / driver create rows in `onboarding_requests`.
- [ ] `/admin/onboarding` shows pending requests; approving a vendor creates a `vendors` row + `vendor_staff` link.
- [ ] `/admin/vendors` shows all vendors with toggle active/inactive and commission editor.
- [ ] `/admin/settings` saves rows to `platform_settings`.
- [ ] `/vendor/inventory`, `/vendor/sales-invoices`, `/vendor/purchase-invoices`, `/vendor/customers`, `/vendor/suppliers` are reachable only by vendor staff or admin (otherwise redirect to `/`).
- [ ] `/erp/*` URLs all redirect to `/vendor/*` counterparts.
- [ ] A regular customer logged in does **not** see admin/vendor/driver panel links anywhere.
- [ ] Place cash order → tracked in `/orders/[id]` → driver sees it in `/driver/orders`.
- [ ] Place card order → redirected to Stripe Checkout → returns to `/orders/[id]?paid=1` → transaction recorded.
- [ ] `/admin/orders` updates in realtime when status changes.
- [ ] Push notification received when status changes.
- [ ] Sentry receives a test event.
- [ ] PostHog receives `pageview` and `order_placed` events.
- [ ] `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `sw.js` all 200.
- [ ] Lighthouse Desktop ≥ 90 in Performance / Accessibility / Best Practices / SEO.

---

## 9) Rollback

- Vercel → Deployments → previous green deployment → **Promote to Production**.
- Stripe webhook will continue to work; orders affected during the bad window can be re-reconciled from `transactions` table.
- For DB-level regressions, restore from latest Supabase backup into a fresh project, then swap env vars.
