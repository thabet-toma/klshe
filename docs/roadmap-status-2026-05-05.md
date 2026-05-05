# Roadmap Status - 2026-05-05

هذا الملف يوثق الحالة الفعلية بعد مراجعة الكود الحالية.

## Done / Implemented

- `vendor_categories` + `vendors.vendor_category_id` + `products.vendor_category_id` موجودة في `migration_004_schema_pro.sql`.
- طوابع دورة الطلب (`accepted_at`, `ready_at`, `picked_at`, `delivered_at`) + `address_id` + `eta_minutes` + `cancellation_reason` موجودة في schema pro migration.
- `delivery_drivers.user_id` + `transactions.vendor_id` موجودة.
- RLS أساسي مكتمل لـ `orders/products/menu_categories` مع:
  - customer own orders
  - vendor staff RW own vendor
  - driver assigned select
  - platform admin all
- helper functions موجودة:
  - `public.is_vendor_staff(vendor_id)`
  - `public.assigned_to_driver(order_id)`
- JWT hook function موجودة: `public.custom_access_token_hook(event jsonb)` في `migration_007_auth_claim_role.sql`.
- finance core schemas موجودة:
  - `vendor_balances`
  - `payouts`
  - `sales_invoices`
- migration عملة الأغورة موجودة: `migration_005_currency_agorot.sql` (تحويل monetary columns إلى `bigint`).
- `POST /api/orders` يستخدم `customer_id` من الجلسة + `address_id` + يحل `vendor_id` من عناصر السلة.
- `/vendor/settings` + `/api/vendor/profile` موجودة.
- `/vendor/payouts` + `/api/vendor/payouts` موجودة.
- `VendorOrdersClient` + `PATCH /api/vendor/orders/[id]` لأزرار `accept/reject/ready` مع timestamps.
- رفع شعار/بانر عبر storage endpoint موجود: `/api/vendor/upload-asset`.
- favorites server sync موجودة: `favorites` API + merge endpoint.
- search RPC/tsvector migrations موجودة (`migration_010`, `migration_011`).
- near-me endpoint/section موجودة مبدئيا: `/api/storefront/nearby-vendors` + `NearMeVendorsSection`.
- Cart replace modal موجود: `CartReplaceDialog`.
- `/api/admin/orders` تم إضافتها اليوم مع GET/PATCH.
- `OrdersBoard` تم ربطها اليوم ببيانات حقيقية من `/api/admin/orders` + فلتر متجر.

## Not Done / Still Open

- Phone OTP + واجهة اختيار email/phone في login/signup (حاليا login email OTP فقط).
- `/signup` role-based onboarding (customer/vendor/driver) غير موجود كصفحة تدفقات.
- تفعيل hook فعلياً داخل Supabase Dashboard (الدالة موجودة لكن الربط التشغيلي خارجي).
- `PATCH /api/driver/orders/[id]` lifecycle للسائق غير موجود.
- تطبيق السائق على Mapbox + Waze fallback غير موجود.
- حساب delivery fee بالمسافة من Mapbox Directions غير موجود.
- `on_order_delivered(order_id)` ledger automation (stock decrement + invoice + vendor balance) غير موجود.
- عمولة المنصة التشغيلية B4.1 (خصم تلقائي من الفاتورة) غير مكتملة.
- Realtime شامل للطلبات (`orders`, `order_items`) غير مكتمل على مستوى admin/storefront tracking.
- `/account/addresses` CRUD كاملة + دمج checkout address picker/map غير مكتمل.
- filters المتقدمة للبحث (`open_now`, `free_delivery`, `rating`, `min_order`, `cuisine`) غير مكتملة UI/RPC.
- ratings بعد التسليم + reorder + coupons غير مكتملة.
- Web Push غير مطبق.
- i18n (`next-intl`, `/ar`, `/he`, `/en`) غير مطبق.
- dark mode غير مطبق.
- توحيد Zod schemas لكل `/api/*` غير مكتمل.
- rate limit + CORS hardening + env audit غير مكتمل.
- Sentry/PostHog + tests (`Vitest/Playwright`) + CI workflows غير مكتملة.
- PWA + legal pages + production infra checklist + payment gateway + DNS/Vercel setup غير مكتملة.

## Next Recommended Batch

1. `A2 auth/signup`: phone OTP + multi-role signup onboarding.
2. `B3 driver lifecycle`: `/api/driver/orders/[id]` + driver UI transitions.
3. `B4 ledger automation`: `on_order_delivered()` + commission application.
