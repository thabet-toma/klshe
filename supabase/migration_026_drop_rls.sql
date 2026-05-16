-- migration_026: إسقاط RLS بالكامل (ميّت — التطبيق يستخدم service-role)
--
-- النموذج الأمني: Firebase identity + حراسة طبقة التطبيق (lib/auth/guard).
-- Supabase client = service-role → يتجاوز RLS دائماً.
-- هذه السياسات لا تُفعّل شيئاً وتُربك الصيانة فقط.

-- ============================================================
-- 1) إسقاط جميع سياسات RLS المعروفة
-- ============================================================

-- orders
drop policy if exists "orders_customer_select_own" on public.orders;
drop policy if exists "orders_vendor_rw_own" on public.orders;
drop policy if exists "orders_driver_select_assigned" on public.orders;
drop policy if exists "orders_driver_select_assigned_or_broadcast" on public.orders;
drop policy if exists "orders_platform_admin_all" on public.orders;

-- products
drop policy if exists "products_public_read_active" on public.products;
drop policy if exists "products_vendor_rw_own" on public.products;
drop policy if exists "products_platform_admin_all" on public.products;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_select_all" on public.profiles;

-- vendors
drop policy if exists "vendors_public_read_active" on public.vendors;

-- menu_categories
drop policy if exists "menu_categories_public_read" on public.menu_categories;
drop policy if exists "menu_categories_public_read_active_vendor" on public.menu_categories;
drop policy if exists "menu_categories_vendor_rw_own" on public.menu_categories;
drop policy if exists "menu_categories_platform_admin_all" on public.menu_categories;

-- transactions
drop policy if exists "transactions_vendor_select_own" on public.transactions;
drop policy if exists "transactions_platform_admin_all" on public.transactions;

-- vendor_staff
drop policy if exists "vendor_staff_select_own" on public.vendor_staff;
drop policy if exists "vendor_staff_select_admin" on public.vendor_staff;

-- favorites
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

-- platform_settings
drop policy if exists platform_settings_admin_all on public.platform_settings;
drop policy if exists platform_settings_public_read on public.platform_settings;

-- vendor_inventory
drop policy if exists vendor_inventory_select on public.vendor_inventory;
drop policy if exists vendor_inventory_modify on public.vendor_inventory;

-- vendor_suppliers
drop policy if exists vendor_suppliers_all on public.vendor_suppliers;

-- vendor_customers
drop policy if exists vendor_customers_all on public.vendor_customers;

-- vendor_customer_transactions
drop policy if exists vendor_customer_tx_all on public.vendor_customer_transactions;

-- vendor_sales_invoices
drop policy if exists vendor_sales_invoices_all on public.vendor_sales_invoices;

-- vendor_sales_invoice_items
drop policy if exists vendor_sales_invoice_items_all on public.vendor_sales_invoice_items;

-- vendor_purchase_invoices
drop policy if exists vendor_purchase_invoices_all on public.vendor_purchase_invoices;

-- vendor_purchase_invoice_items
drop policy if exists vendor_purchase_invoice_items_all on public.vendor_purchase_invoice_items;

-- vendor_balances
drop policy if exists "vendor_balances_vendor_select_own" on public.vendor_balances;
drop policy if exists "vendor_balances_platform_admin_all" on public.vendor_balances;

-- payouts
drop policy if exists "payouts_vendor_rw_own" on public.payouts;
drop policy if exists "payouts_platform_admin_all" on public.payouts;

-- sales_invoices
drop policy if exists "sales_invoices_vendor_select_own" on public.sales_invoices;
drop policy if exists "sales_invoices_platform_admin_all" on public.sales_invoices;

-- delivery_drivers
drop policy if exists "public read delivery_drivers" on public.delivery_drivers;

-- categories
drop policy if exists "public read categories" on public.categories;

-- order_items
-- (no explicit policies found, but disable RLS anyway)

-- vendor_categories
drop policy if exists "vendor_categories_public_read_active" on public.vendor_categories;

-- ratings
drop policy if exists "ratings_select_own" on public.ratings;
drop policy if exists "ratings_insert_own" on public.ratings;

-- addresses
drop policy if exists "addresses_select_own" on public.addresses;
drop policy if exists "addresses_insert_own" on public.addresses;
drop policy if exists "addresses_update_own" on public.addresses;
drop policy if exists "addresses_delete_own" on public.addresses;

-- push_subscriptions
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;

-- onboarding_requests
drop policy if exists "onboarding_requests_select_own" on public.onboarding_requests;
drop policy if exists "onboarding_requests_insert_own" on public.onboarding_requests;
drop policy if exists "onboarding_requests_admin_all" on public.onboarding_requests;

-- coupons
drop policy if exists "coupons_public_select" on public.coupons;

-- audit_log
drop policy if exists "audit_log_admin_select_all" on public.audit_log;
drop policy if exists "audit_log_function_insert" on public.audit_log;

-- storage.objects (vendor assets)
drop policy if exists "vendor_assets_public_read" on storage.objects;

-- ============================================================
-- 2) تعطيل RLS على جميع الجداول
-- ============================================================

alter table public.orders disable row level security;
alter table public.products disable row level security;
alter table public.profiles disable row level security;
alter table public.vendors disable row level security;
alter table public.menu_categories disable row level security;
alter table public.transactions disable row level security;
alter table public.vendor_staff disable row level security;
alter table public.favorites disable row level security;
alter table public.platform_settings disable row level security;
alter table public.vendor_inventory disable row level security;
alter table public.vendor_suppliers disable row level security;
alter table public.vendor_customers disable row level security;
alter table public.vendor_customer_transactions disable row level security;
alter table public.vendor_sales_invoices disable row level security;
alter table public.vendor_sales_invoice_items disable row level security;
alter table public.vendor_purchase_invoices disable row level security;
alter table public.vendor_purchase_invoice_items disable row level security;
alter table public.vendor_balances disable row level security;
alter table public.payouts disable row level security;
alter table public.sales_invoices disable row level security;
alter table public.delivery_drivers disable row level security;
alter table public.categories disable row level security;
alter table public.order_items disable row level security;
alter table public.vendor_categories disable row level security;
alter table public.ratings disable row level security;
alter table public.addresses disable row level security;
alter table public.push_subscriptions disable row level security;
alter table public.onboarding_requests disable row level security;
alter table public.coupons disable row level security;
alter table public.audit_log disable row level security;

-- ============================================================
-- ملاحظات:
-- - التخزين (storage.objects) لا يدعم disable RLS عبر SQL عادي؛
--   السياسات أُسقطت أعلاه لكن الـ bucket يبقى محمياً بإعدادات Supabase Dashboard.
-- - الدوال المساعدة (is_vendor_staff, is_driver_assigned, etc.) تبقى
--   لأنها قد تُستخدم في استعلامات أو views أخرى.
-- ============================================================
