# PROJECT_MAP — JeTek (جيتك)

## Overview
Multi-vendor delivery platform (like Talabat/Noon) built with Next.js 16, Firebase Auth, Supabase, Tailwind CSS v4, Capacitor.

## Tech Stack
- **Framework**: Next.js 16.2.4 (App Router)
- **Auth**: Firebase Auth (email/password + Google) → custom session API → Supabase-compatible cookies
- **Database**: Supabase (Postgres) with service-role client
- **UI**: Tailwind CSS v4, Lucide icons, Framer Motion
- **Mobile**: Capacitor (Android)
- **Payments**: Stripe
- **Analytics**: PostHog, Sentry
- **Rate Limit**: Upstash Redis

## Directory Structure

```
app/
├── (storefront)/     # Public-facing storefront (locale-prefixed via middleware)
│   ├── page.tsx      # Home: hero, categories, vendors, offers, trending
│   ├── layout.tsx    # Header, search, cart, footer, bottom nav
│   ├── store/        # Store detail page
│   ├── product/      # Product detail page
│   ├── category/     # Category listing
│   ├── categories/   # All categories
│   ├── search/       # Search results
│   ├── orders/       # Customer order tracking
│   ├── checkout/     # Checkout flow
│   ├── account/      # Customer account
│   ├── favorites/    # Customer favorites
│   └── addresses/    # Customer addresses
├── admin/            # Admin panel (platform_admin only)
│   ├── page.tsx      # Dashboard with KPIs, recent orders, quick actions
│   ├── layout.tsx    # Admin shell with sidebar + topbar
│   ├── orders/       # Order management board
│   ├── vendors/      # Vendor list (toggle, commission edit) **+ Add Store**
│   ├── onboarding/   # Onboarding requests (approve/reject vendor, driver)
│   ├── drivers/      # Driver CRUD
│   ├── categories/   # Category CRUD
│   ├── products/     # Product management
│   ├── customers/    # Customer list (mock data)
│   ├── commissions/  # Commission settings (reuses vendors client)
│   └── settings/     # Platform settings (commission, delivery fees, support)
├── vendor/           # Vendor workspace
│   ├── page.tsx      # Dashboard with KPIs, low stock alerts
│   ├── layout.tsx    # Vendor shell with sidebar, vendor switcher
│   ├── orders/       # Vendor order management
│   ├── menu/         # Menu categories
│   ├── products/     # Product CRUD
│   ├── inventory/    # Stock management
│   ├── sales-invoices/     # Sales invoicing
│   ├── purchase-invoices/  # Purchase invoicing
│   ├── suppliers/    # Supplier management
│   ├── customers/    # Customer accounts (B2B)
│   ├── settings/     # Vendor profile, hours, location **+ Request New Store**
│   └── payouts/      # Payout/settlement requests
├── driver/           # Driver panel
│   ├── page.tsx      # Driver dashboard
│   ├── orders/       # Driver order management
│   └── settlement/   # Driver settlement
├── login/            # Login page (email/password + Google)
├── signup/           # Signup page (role selection + Google)
├── auth/callback/    # OAuth callback (Supabase redirect)
├── api/              # API routes
│   ├── auth/session/ # Firebase ID token → session cookies
│   ├── onboarding-requests/ # Create/list onboarding requests
│   ├── admin/        # Admin API (vendors, onboarding, categories, etc.)
│   └── vendor/       # Vendor API (profile, products, orders, etc.)
├── erp/              # Legacy ERP pages (replaced by vendor workspace)
└── components/       # Shared components
    ├── auth/         # LoginForm, SignupForm
    ├── admin/        # AdminShell, AdminDashboard, AdminVendorsClient, etc.
    ├── vendor/       # VendorWorkspace, VendorHomeClient, VendorSettingsClient, etc.
    ├── storefront/   # HeroCarousel, ProductCard, VendorCard, etc.
    └── ui/           # RoleSwitcher, etc.

lib/
├── auth/             # Auth helpers (roles, guards, route-supabase compat)
├── firebase/         # Firebase config, admin, session
├── supabase/         # Supabase clients, types, middleware, env, storefront queries
├── schemas/          # Zod schemas (onboarding request)
├── stores/           # Zustand stores (cart, orders, favorites)
├── analytics/        # PostHog
├── payments/         # Stripe
├── geo/              # Geolocation
├── i18n/             # Arabic locale config
├── push/             # Push notifications
├── security/         # Security helpers
├── currency/         # ILS agorot conversion
├── images/           # Image utilities
├── vendors/          # Default vendor config
├── brand.ts          # BRAND_NAME constants
├── data.ts           # Mock categories, products, banners + formatPrice
├── mock.ts           # Mock orders, drivers, customers, suppliers
└── types.ts          # Shared TypeScript types

supabase/
├── schema.sql        # Core tables (original schema)
├── bootstrap_full.sql
├── migration_*.sql   # 19 incremental migrations (auth, pro, vendor portal, etc.)
└── migration_all_in_one.sql

tests/
├── e2e/              # Playwright E2E (storefront-checkout)
├── schemas.test.ts   # Zod schema validation tests
├── totals.test.ts    # Pricing arithmetic tests
├── cart-store.test.ts # Zustand cart store tests
├── currency.test.ts  # Currency conversion tests
└── setup.ts          # Test bootstrap

```

## Auth Flow
1. Firebase Auth (email/password or Google popup) → ID token
2. POST `/api/auth/session` verifies ID token via Firebase Admin SDK
3. Maps Firebase UID → deterministic UUID for Supabase profiles
4. Sets session cookies (`fb_uid`, `fb_profile_id`, `fb_role`, `fb_email`)
5. Middleware + API guards read cookies to check roles

## Roles
- `customer` — default, can browse and order
- `vendor_staff` — can access `/vendor` panel (linked via `vendor_staff` table)
- `platform_admin` — can access `/admin` panel
- `driver` — can access `/driver` panel (linked via `delivery_drivers` table)

## Issues Fixed in This PR

### 0. Google Login: "missing initial state" Error on Mobile
- **Problem**: On mobile, `signInWithPopup` fails when the browser blocks popups. Firebase SDK leaves stale redirect state in `sessionStorage`. On next page load, Firebase tries to process the stale state and throws `"Unable to process request due to missing initial state"`. The user sees a white page and then this error on refresh.
- **Fix**: 
  - Added `clearFirebaseRedirectState()` in `firebase/config.ts` that scrubs all Firebase-related keys from `sessionStorage` (not just `firebase:pendingRedirect:`)
  - Called it before every Google sign-in attempt
  - Added `useEffect` in both forms that calls `getRedirectResult()` on mount to complete any pending `signInWithRedirect` flow
  - When `signInWithPopup` fails with `auth/popup-blocked`, falls back to `signInWithRedirect` which redirects the page to Google — when the user comes back, the `useEffect` picks up the result and completes the login
- **Files**: `lib/firebase/config.ts`, `app/components/auth/LoginForm.tsx`, `app/components/auth/SignupForm.tsx`

### 1. Google Login Hidden (LoginForm + SignupForm)
- **Problem**: Google sign-in buttons were wrapped in `{!isNative && (...)}` conditionals that hid them on Capacitor native platforms. The `useEffect` detection was unreliable and the native check prevented Google sign-in on all platforms where Capacitor was detected.
- **Fix**: Removed `isNative` conditionals. Google buttons now show on all platforms. Popup errors on native are handled gracefully with user-visible messages. Removed unused `useEffect` and `isNative` state.

### 2. Admin: No Way to Add Stores
- **Problem**: Admin vendors page (`AdminVendorsClient`) only listed existing vendors with toggle/commission edit. No "Add Store" button existed.
- **Fix**: Added collapsible "إضافة متجر" (Add Store) form with name, commission rate, and description fields. Added `POST /api/admin/vendors` endpoint that creates a new vendor in Supabase.

### 3. Admin: No Pending Onboarding Badge
- **Problem**: Admin sidebar had no indicator of pending onboarding requests, forcing admins to repeatedly check the onboarding page.
- **Fix**: Added `GET /api/admin/onboarding/count` endpoint. Modified `AdminShell` to fetch pending count on mount and display a red badge on the "طلبات الانضمام" nav item.

### 4. Vendor: No Way to Request Adding a Store
- **Problem**: Once logged in as a customer, there was no way to request becoming a vendor. The onboarding request flow only existed during signup.
- **Fix**: Added `RequestNewStoreSection` component in `VendorSettingsClient` with a form to submit a new store request via the existing `/api/onboarding-requests` endpoint. Shows even when the user has no active vendors, with appropriate messaging.

## Remaining Issues / Future Work
1. **No test for onboarding approval flow** — approving a vendor_staff request creates a vendor + staff record but has no e2e test
2. **No admin audit log** — no record of admin actions (toggle store, approve/reject, change settings)
3. **No analytics in admin dashboard** — KPIs use static mock data
4. **No pagination** — large datasets (orders, products) will be slow
5. **No bulk operations** — cannot bulk activate/deactivate vendors or products
6. **No vendor deletion from admin** — can only toggle active/inactive
7. **No email notifications** — onboarding approval/rejection, new orders, etc. aren't emailed
8. **No coupon management UI** — coupons table exists in schema but no admin UI
9. **No rating/review moderation** — ratings table exists, no admin interface
