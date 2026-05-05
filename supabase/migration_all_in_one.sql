-- Combined migrations file (auto-generated)

-- ============================================================
-- BEGIN: migration_002_multi_vendor_auth.sql
-- ============================================================

-- المرحلة 1: ملفات تعريف المستخدمين (مرتبطة بـ auth.users) + متاجر + عناوين + RBAC أساسي
-- نفّذ هذا الملف في SQL Editor بعد schema.sql (أو على مشروع قائم).
-- بعد أول تسجيل دخول، حدّث يدوياً:
--   update public.profiles set role = 'platform_admin' where id = '<uuid-from-auth.users>';

-- ─── ملفات تعريف المستخدم ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer'
    check (role in ('customer', 'platform_admin', 'vendor_staff', 'driver')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);

alter table public.profiles enable row level security;

-- دالة مساعدة (تتجاوز RLS عند التحقق من الدور)
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'platform_admin'
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
on public.profiles for select
using (public.is_platform_admin());

-- إنشاء ملف عند تسجيل مستخدم جديد في Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ملفات لحسابات قديمة بلا صف (بعد تفعيل المشغّل)
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
  'customer'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ─── متاجر (Multi-vendor) ──────────────────────────────────────────────────
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  banner_url text,
  category_id text not null references public.categories (id) on delete restrict,
  is_active boolean not null default true,
  default_prep_minutes integer not null default 25 check (default_prep_minutes >= 0),
  min_order_amount numeric(12, 2) not null default 0 check (min_order_amount >= 0),
  delivery_fee_base numeric(12, 2) not null default 0 check (delivery_fee_base >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_vendors_category on public.vendors (category_id);
create index if not exists idx_vendors_active on public.vendors (is_active);

alter table public.vendors enable row level security;

drop policy if exists "vendors_public_read_active" on public.vendors;
create policy "vendors_public_read_active"
on public.vendors for select
using (is_active = true);

-- ─── فئات قائمة الطعام/المنتجات داخل المتجر ─────────────────────────────────
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_categories_vendor on public.menu_categories (vendor_id);

alter table public.menu_categories enable row level security;

drop policy if exists "menu_categories_public_read" on public.menu_categories;
create policy "menu_categories_public_read"
on public.menu_categories for select
using (
  exists (
    select 1 from public.vendors v
    where v.id = menu_categories.vendor_id and v.is_active = true
  )
);

-- ─── موظفو المتجر (مرحلة لاحقة: لوحة /vendor) ───────────────────────────────
create table if not exists public.vendor_staff (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  staff_role text not null default 'manager'
    check (staff_role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (vendor_id, profile_id)
);

create index if not exists idx_vendor_staff_profile on public.vendor_staff (profile_id);

alter table public.vendor_staff enable row level security;

-- لا سياسات قراءة عامة — يُدار لاحقاً عبر RLS للمتجر

-- ─── عناوين الزبائن ─────────────────────────────────────────────────────────
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  line1 text not null,
  city text,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_addresses_profile on public.addresses (profile_id);

alter table public.addresses enable row level security;

drop policy if exists "addresses_own_all" on public.addresses;
create policy "addresses_own_all"
on public.addresses for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- ─── ربط المنتجات بالمتجر ───────────────────────────────────────────────────
alter table public.products
  add column if not exists vendor_id uuid references public.vendors (id) on delete restrict;

alter table public.products
  add column if not exists menu_category_id uuid references public.menu_categories (id) on delete set null;

-- متجر افتراضي واحد يضم المنتجات الحالية (جيتك)
insert into public.vendors (id, slug, name, description, category_id, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'jetek-main',
  'جيتك — المتجر الرئيسي',
  'متجر افتراضي للبيانات الحالية إلى حين إضافة متاجر حقيقية.',
  'c1',
  true
)
on conflict (id) do nothing;

update public.products
set vendor_id = '00000000-0000-0000-0000-000000000001'
where vendor_id is null;

-- ─── ربط الطلبات بالمتجر والزبون (اختياري في البداية) ───────────────────────
alter table public.orders
  add column if not exists vendor_id uuid references public.vendors (id) on delete set null;

alter table public.orders
  add column if not exists customer_id uuid references auth.users (id) on delete set null;

create index if not exists idx_orders_vendor on public.orders (vendor_id);
create index if not exists idx_orders_customer on public.orders (customer_id);

comment on table public.profiles is 'ملف يُنشأ تلقائياً مع Auth؛ role=platform_admin للمدير فقط (يدوياً أو عبر أداة).';
comment on table public.vendors is 'متاجر المنصة — كل منتج ينتمي لمتجر واحد.';
comment on column public.products.vendor_id is 'المتجر الذي يبيع هذا المنتج.';


-- END: migration_002_multi_vendor_auth.sql

-- ============================================================
-- BEGIN: migration_003_vendor_portal_rls.sql
-- ============================================================

-- المرحلة 2: RLS لجدول vendor_staff + استعلامات من جلسة المستخدم (لوحة /vendor)
-- نفّذ بعد migration_002_multi_vendor_auth.sql
--
-- لربط مستخدم بمتجر (مثال):
--   insert into public.vendor_staff (vendor_id, profile_id, staff_role)
--   values (
--     '00000000-0000-0000-0000-000000000001',
--     '<uuid-من-auth.users>',
--     'owner'
--   );
--   update public.profiles set role = 'vendor_staff' where id = '<نفس-uuid>';  -- اختياري للتناسق

-- قراءة صفوف موظف المتجر لصاحب الحساب
drop policy if exists "vendor_staff_select_own" on public.vendor_staff;
create policy "vendor_staff_select_own"
on public.vendor_staff for select
using (profile_id = auth.uid());

-- مدراء المنصة يرون كل الروابط (للدعم)
drop policy if exists "vendor_staff_select_admin" on public.vendor_staff;
create policy "vendor_staff_select_admin"
on public.vendor_staff for select
using (public.is_platform_admin());

comment on table public.vendor_staff is
  'ربط profile بمتجر؛ RLS يسمح بقراءة صفوف المستخدم + مدراء المنصة.';


-- END: migration_003_vendor_portal_rls.sql

-- ============================================================
-- BEGIN: migration_004_schema_pro.sql
-- ============================================================

-- المرحلة A1.1: فصل تصنيفات المتاجر وربط vendors بها بشكل انتقالي آمن.
-- نفّذ بعد migration_002_multi_vendor_auth.sql.
--
-- ملاحظة مهمة:
-- - نبقي العمود القديم vendors.category_id مؤقتاً لتفادي كسر الواجهات الحالية.
-- - العمود الجديد الرسمي: vendors.vendor_category_id.
-- - سيُنقل استهلاك الواجهة للعمود الجديد ثم نحذف القديم في migration لاحقة.

create table if not exists public.vendor_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  emoji text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_categories_active
  on public.vendor_categories (is_active);

create index if not exists idx_vendor_categories_sort
  on public.vendor_categories (sort_order);

alter table public.vendor_categories enable row level security;

drop policy if exists "vendor_categories_public_read_active" on public.vendor_categories;
create policy "vendor_categories_public_read_active"
on public.vendor_categories for select
using (is_active = true);

insert into public.vendor_categories (id, slug, name, emoji, sort_order, is_active)
values
  ('vc_restaurants', 'restaurants', 'مطاعم', '🍔', 10, true),
  ('vc_grocery', 'grocery', 'بقالة', '🛒', 20, true),
  ('vc_pharmacy', 'pharmacy', 'صيدلية', '💊', 30, true),
  ('vc_sweets', 'sweets', 'حلويات', '🍰', 40, true),
  ('vc_beverages', 'beverages', 'مشروبات', '🥤', 50, true)
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

alter table public.vendors
  add column if not exists vendor_category_id text;

alter table public.vendors
  add column if not exists opening_hours jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'vendors'
      and tc.constraint_name = 'vendors_vendor_category_id_fkey'
  ) then
    alter table public.vendors
      add constraint vendors_vendor_category_id_fkey
      foreign key (vendor_category_id)
      references public.vendor_categories (id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_vendors_vendor_category
  on public.vendors (vendor_category_id);

-- backfill انتقالي من category_id القديم إلى vendor_category_id.
update public.vendors
set vendor_category_id = case category_id
  when 'c2' then 'vc_restaurants'
  when 'c1' then 'vc_grocery'
  when 'c4' then 'vc_sweets'
  when 'c6' then 'vc_beverages'
  else 'vc_grocery'
end
where vendor_category_id is null;

-- نجعل العمود الجديد مطلوباً (بعد backfill).
alter table public.vendors
  alter column vendor_category_id set not null;

comment on table public.vendor_categories is
  'التصنيف العام للمتجر (مطاعم/بقالة/صيدلية...) المستخدم في الصفحة الرئيسية.';
comment on column public.vendors.vendor_category_id is
  'التصنيف العام الرسمي للمتجر. بديل category_id القديم.';
comment on column public.vendors.opening_hours is
  'ساعات العمل بصيغة JSON (مثال: {"sun":"08:00-22:00"}).';

-- ============================================================================
-- المرحلة A1.2: تحديث products ليدعم التصنيف العام الجديد + تصنيف قائمة المتجر
-- ============================================================================

alter table public.products
  add column if not exists vendor_category_id text;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_schema = 'public'
      and tc.table_name = 'products'
      and tc.constraint_name = 'products_vendor_category_id_fkey'
  ) then
    alter table public.products
      add constraint products_vendor_category_id_fkey
      foreign key (vendor_category_id)
      references public.vendor_categories (id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_products_vendor_category
  on public.products (vendor_category_id);

create index if not exists idx_products_vendor
  on public.products (vendor_id);

-- backfill من vendors.vendor_category_id عبر vendor_id.
update public.products p
set vendor_category_id = v.vendor_category_id
from public.vendors v
where p.vendor_id = v.id
  and p.vendor_category_id is null;

-- fallback احتياطي من category_id القديم.
update public.products
set vendor_category_id = case category_id
  when 'c2' then 'vc_restaurants'
  when 'c1' then 'vc_grocery'
  when 'c4' then 'vc_sweets'
  when 'c6' then 'vc_beverages'
  else 'vc_grocery'
end
where vendor_category_id is null;

alter table public.products
  alter column vendor_category_id set not null;

-- category_id القديم يصبح انتقالياً (nullable) لأن المرجع النهائي هو vendor/menu categories.
alter table public.products
  alter column category_id drop not null;

-- vendor_id يصبح مطلوباً في نموذج multi-vendor.
alter table public.products
  alter column vendor_id set not null;

comment on column public.products.vendor_category_id is
  'تصنيف عام للفلترة على مستوى المنصة (مرتبط بـ vendor_categories).';
comment on column public.products.category_id is
  'حقل انتقالي قديم — سيُزال بعد اكتمال نقل الاستهلاك إلى vendor_category_id + menu_category_id.';

-- ============================================================================
-- المرحلة A1.3: توسيع orders لخط حياة الطلب وعناوين الزبون
-- ============================================================================

alter table public.orders
  add column if not exists address_id uuid references public.addresses (id) on delete set null;

alter table public.orders
  add column if not exists eta_minutes integer check (eta_minutes is null or eta_minutes >= 0);

alter table public.orders
  add column if not exists accepted_at timestamptz;

alter table public.orders
  add column if not exists ready_at timestamptz;

alter table public.orders
  add column if not exists picked_at timestamptz;

alter table public.orders
  add column if not exists delivered_at timestamptz;

alter table public.orders
  add column if not exists cancellation_reason text;

create index if not exists idx_orders_address on public.orders (address_id);
create index if not exists idx_orders_driver on public.orders (driver_id);

-- دعم حالة rejected للدورة التشغيلية.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'orders_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders drop constraint orders_status_check;
  end if;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'accepted', 'preparing', 'ready', 'dispatched', 'on_way', 'delivered', 'cancelled', 'rejected'));

-- ============================================================================
-- المرحلة A1.4: ربط السائق بـ auth.users
-- ============================================================================

alter table public.delivery_drivers
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists idx_delivery_drivers_user
  on public.delivery_drivers (user_id)
  where user_id is not null;

-- ============================================================================
-- المرحلة A1.5: ربط transactions بالمتجر
-- ============================================================================

alter table public.transactions
  add column if not exists vendor_id uuid references public.vendors (id) on delete set null;

create index if not exists idx_transactions_vendor
  on public.transactions (vendor_id);

update public.transactions t
set vendor_id = o.vendor_id
from public.orders o
where o.id = t.order_id
  and t.vendor_id is null;

-- ============================================================================
-- جزء أساسي من A1.7: سياسات RLS لطلبات الزبون/البائع/السائق
-- ============================================================================

-- helper: هل المستخدم staff في متجر معيّن؟
create or replace function public.is_vendor_staff(target_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_staff vs
    where vs.profile_id = auth.uid()
      and vs.vendor_id = target_vendor_id
  );
$$;

-- helper: هل الطلب معيّن للسائق الحالي؟
-- ندعم text و uuid لأن بعض المشاريع القديمة تستخدم id نصي للسائق
-- ومشاريع أخرى تستخدم uuid.
create or replace function public.is_driver_assigned(target_driver_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.delivery_drivers dd
    where dd.id::text = target_driver_id
      and dd.user_id = auth.uid()
  );
$$;

create or replace function public.is_driver_assigned(target_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_driver_assigned(target_driver_id::text);
$$;

alter table public.orders enable row level security;

drop policy if exists "orders_customer_select_own" on public.orders;
create policy "orders_customer_select_own"
on public.orders for select
using (customer_id = auth.uid());

drop policy if exists "orders_vendor_rw_own" on public.orders;
create policy "orders_vendor_rw_own"
on public.orders for all
using (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
)
with check (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
);

drop policy if exists "orders_driver_select_assigned" on public.orders;
create policy "orders_driver_select_assigned"
on public.orders for select
using (
  driver_id is not null and public.is_driver_assigned(driver_id)
);

drop policy if exists "orders_platform_admin_all" on public.orders;
create policy "orders_platform_admin_all"
on public.orders for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- helper اختياري للاستخدام في سياسات/استعلامات لاحقة.
-- ملاحظة: delivery_drivers.id نوعه text بينما orders.driver_id قد يكون uuid أو text
-- حسب تطور المشروع، لذلك نستخدم cast صريح للـtext لمنع خطأ "text = uuid".
create or replace function public.assigned_to_driver(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.delivery_drivers dd on dd.id = o.driver_id::text
    where o.id = target_order_id
      and dd.user_id = auth.uid()
  );
$$;

-- products: staff المتجر RW + قراءة عامة للمنتجات النشطة + platform admin all
alter table public.products enable row level security;

drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active"
on public.products for select
using (is_active = true);

drop policy if exists "products_vendor_rw_own" on public.products;
create policy "products_vendor_rw_own"
on public.products for all
using (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
)
with check (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
);

drop policy if exists "products_platform_admin_all" on public.products;
create policy "products_platform_admin_all"
on public.products for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- menu_categories: staff المتجر RW + قراءة عامة للمستخدمين ضمن متجر نشط
alter table public.menu_categories enable row level security;

drop policy if exists "menu_categories_public_read_active_vendor" on public.menu_categories;
create policy "menu_categories_public_read_active_vendor"
on public.menu_categories for select
using (
  exists (
    select 1
    from public.vendors v
    where v.id = menu_categories.vendor_id
      and v.is_active = true
  )
);

drop policy if exists "menu_categories_vendor_rw_own" on public.menu_categories;
create policy "menu_categories_vendor_rw_own"
on public.menu_categories for all
using (public.is_vendor_staff(vendor_id))
with check (public.is_vendor_staff(vendor_id));

drop policy if exists "menu_categories_platform_admin_all" on public.menu_categories;
create policy "menu_categories_platform_admin_all"
on public.menu_categories for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- transactions: vendor staff read own + platform admin all.
alter table public.transactions enable row level security;

drop policy if exists "transactions_vendor_select_own" on public.transactions;
create policy "transactions_vendor_select_own"
on public.transactions for select
using (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
);

drop policy if exists "transactions_platform_admin_all" on public.transactions;
create policy "transactions_platform_admin_all"
on public.transactions for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

comment on function public.assigned_to_driver(uuid) is
  'يتحقق إن كان الطلب معيّناً للسائق الحالي عبر delivery_drivers.user_id.';

-- ملاحظة A1.8 (يتطلب إعداد في لوحة Supabase):
-- - لإضافة role كـ JWT claim: أنشئ Custom Access Token Hook يقرأ profiles.role
--   ويحقنه في claims (مثلاً app_metadata.role).
-- - عندها يمكن كتابة سياسات تعتمد مباشرة على claim بدلاً من join.



-- END: migration_004_schema_pro.sql

-- ============================================================
-- BEGIN: migration_005_currency_agorot.sql
-- ============================================================

-- المرحلة A6.1: توحيد تخزين العملة بالأغورة (integer / bigint)
-- يشمل تحويل الحقول النقدية من numeric(12,2) إلى bigint مع ضرب ×100.
-- ملاحظة: افترض أن القيم القديمة بالشيكل. بعد هذا الملف تصبح القيم بالأغورة.

-- vendors
alter table public.vendors
  alter column min_order_amount
  type bigint
  using round(min_order_amount * 100)::bigint;

alter table public.vendors
  alter column delivery_fee_base
  type bigint
  using round(delivery_fee_base * 100)::bigint;

alter table public.vendors
  add constraint vendors_min_order_amount_non_negative
    check (min_order_amount >= 0);

alter table public.vendors
  add constraint vendors_delivery_fee_base_non_negative
    check (delivery_fee_base >= 0);

-- products
alter table public.products
  alter column price
  type bigint
  using round(price * 100)::bigint;

alter table public.products
  alter column old_price
  type bigint
  using case when old_price is null then null else round(old_price * 100)::bigint end;

-- orders
alter table public.orders
  alter column subtotal
  type bigint
  using round(subtotal * 100)::bigint;

alter table public.orders
  alter column delivery_fee
  type bigint
  using round(delivery_fee * 100)::bigint;

alter table public.orders
  alter column total
  type bigint
  using round(total * 100)::bigint;

-- order_items
alter table public.order_items
  alter column unit_price
  type bigint
  using round(unit_price * 100)::bigint;

alter table public.order_items
  alter column line_total
  type bigint
  using round(line_total * 100)::bigint;

-- transactions
alter table public.transactions
  alter column amount
  type bigint
  using round(amount * 100)::bigint;

-- delivery_drivers
alter table public.delivery_drivers
  alter column earnings_today
  type bigint
  using round(earnings_today * 100)::bigint;

-- ملاحظة: vendor_balances / payouts / sales_invoices تُنشأ في migration_006_finance_core.sql
-- تحويل أغورتها يتم هناك بعد الإنشاء مباشرةً حتى لا يُستدعى هذا الملف قبل وجود الجداول.

comment on table public.orders is
  'جميع القيم النقدية (subtotal/delivery_fee/total) مخزنة بالأغورة bigint.';
comment on table public.products is
  'price/old_price مخزنة بالأغورة bigint.';


-- END: migration_005_currency_agorot.sql

-- ============================================================
-- BEGIN: migration_006_finance_core.sql
-- ============================================================

-- المرحلة A1.6: أساس مالي احترافي للمتاجر
-- - vendor_balances: رصيد كل متجر
-- - payouts: طلبات/دفعات السحب
-- - sales_invoices: فواتير البيع لكل طلب
--
-- ملاحظة: هذا Migration يؤسس الجداول والسياسات.
-- منطق الترحيل/التحديث التلقائي عند delivered سيأتي في B4.

create table if not exists public.vendor_balances (
  vendor_id uuid primary key references public.vendors (id) on delete cascade,
  available_amount numeric(12,2) not null default 0 check (available_amount >= 0),
  pending_amount numeric(12,2) not null default 0 check (pending_amount >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'paid', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  requested_by uuid references auth.users (id) on delete set null,
  note text
);

create index if not exists idx_payouts_vendor on public.payouts (vendor_id);
create index if not exists idx_payouts_status on public.payouts (status);
create index if not exists idx_payouts_requested_at on public.payouts (requested_at desc);

create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  gross_total numeric(12,2) not null check (gross_total >= 0),
  platform_commission numeric(12,2) not null default 0 check (platform_commission >= 0),
  net_vendor_amount numeric(12,2) not null check (net_vendor_amount >= 0),
  currency text not null default 'ILS',
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_invoices_vendor on public.sales_invoices (vendor_id);
create index if not exists idx_sales_invoices_created on public.sales_invoices (created_at desc);

-- تهيئة أرصدة للمتاجر الحالية
insert into public.vendor_balances (vendor_id)
select v.id
from public.vendors v
where not exists (
  select 1 from public.vendor_balances vb where vb.vendor_id = v.id
);

alter table public.vendor_balances enable row level security;
alter table public.payouts enable row level security;
alter table public.sales_invoices enable row level security;

-- vendor_balances: قراءة لصاحب المتجر + platform admin
drop policy if exists "vendor_balances_vendor_select_own" on public.vendor_balances;
create policy "vendor_balances_vendor_select_own"
on public.vendor_balances for select
using (public.is_vendor_staff(vendor_id));

drop policy if exists "vendor_balances_platform_admin_all" on public.vendor_balances;
create policy "vendor_balances_platform_admin_all"
on public.vendor_balances for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- payouts: vendor يطلب/يرى متجَره + platform admin يدير
drop policy if exists "payouts_vendor_rw_own" on public.payouts;
create policy "payouts_vendor_rw_own"
on public.payouts for all
using (public.is_vendor_staff(vendor_id))
with check (public.is_vendor_staff(vendor_id));

drop policy if exists "payouts_platform_admin_all" on public.payouts;
create policy "payouts_platform_admin_all"
on public.payouts for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- sales_invoices: vendor قراءة فقط + platform admin كل شيء
drop policy if exists "sales_invoices_vendor_select_own" on public.sales_invoices;
create policy "sales_invoices_vendor_select_own"
on public.sales_invoices for select
using (public.is_vendor_staff(vendor_id));

drop policy if exists "sales_invoices_platform_admin_all" on public.sales_invoices;
create policy "sales_invoices_platform_admin_all"
on public.sales_invoices for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

comment on table public.vendor_balances is
  'رصيد كل متجر (available/pending) لدعم التقاص والسحب.';
comment on table public.payouts is
  'طلبات سحب وتحويل رصيد المتجر.';
comment on table public.sales_invoices is
  'فاتورة مبيعات لكل طلب مكتمل تتضمن عمولة المنصة وصافي المتجر.';

-- تحويل أغورة (يجب أن يأتي بعد إنشاء الجداول؛ كان في migration_005 قبل الإنشاء فيخطأ bootstrap)
alter table public.vendor_balances
  alter column available_amount
  type bigint
  using round(available_amount * 100)::bigint;

alter table public.vendor_balances
  alter column pending_amount
  type bigint
  using round(pending_amount * 100)::bigint;

alter table public.payouts
  alter column amount
  type bigint
  using round(amount * 100)::bigint;

alter table public.sales_invoices
  alter column subtotal
  type bigint
  using round(subtotal * 100)::bigint;

alter table public.sales_invoices
  alter column delivery_fee
  type bigint
  using round(delivery_fee * 100)::bigint;

alter table public.sales_invoices
  alter column gross_total
  type bigint
  using round(gross_total * 100)::bigint;

alter table public.sales_invoices
  alter column platform_commission
  type bigint
  using round(platform_commission * 100)::bigint;

alter table public.sales_invoices
  alter column net_vendor_amount
  type bigint
  using round(net_vendor_amount * 100)::bigint;


-- END: migration_006_finance_core.sql

-- ============================================================
-- BEGIN: migration_007_auth_claim_role.sql
-- ============================================================

-- المرحلة A1.8: JWT custom claim role
-- هذا الملف يعرّف دالة hook لإضافة role من profiles إلى access token.
-- بعد التنفيذ:
--   1) Supabase Dashboard -> Authentication -> Hooks -> Custom Access Token
--   2) اختر الدالة: public.custom_access_token_hook
--
-- مخرجات متوقعة داخل JWT:
--   app_metadata.role = "customer" | "platform_admin" | "vendor_staff" | "driver"

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_role text;
begin
  claims := event->'claims';

  select p.role
  into user_role
  from public.profiles p
  where p.id = (event->>'user_id')::uuid;

  if user_role is null then
    user_role := 'customer';
  end if;

  claims := jsonb_set(
    claims,
    '{app_metadata,role}',
    to_jsonb(user_role),
    true
  );

  event := jsonb_set(event, '{claims}', claims, true);
  return event;
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Supabase Auth hook: injects profiles.role into claims.app_metadata.role';


-- END: migration_007_auth_claim_role.sql

-- ============================================================
-- BEGIN: migration_008_storage_vendor_assets.sql
-- ============================================================

-- حاوية تخزين لشعارات وبانرات المتاجر (قراءة عامة؛ الكتابة عبر API بمفتاح الخدمة فقط).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-assets',
  'vendor-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vendor_assets_public_read" on storage.objects;
create policy "vendor_assets_public_read"
on storage.objects for select
to public
using (bucket_id = 'vendor-assets');


-- END: migration_008_storage_vendor_assets.sql

-- ============================================================
-- BEGIN: migration_009_vendors_location.sql
-- ============================================================

-- مواقع المتاجر للترتيب بالمسافة (Haversine من التطبيق أو استعلام لاحق).
-- لا يتطلب PostGIS؛ يتوافق مع خطة «earthdistance» كمسافة جوّية تقريبية.

alter table public.vendors
  add column if not exists location_lat double precision;

alter table public.vendors
  add column if not exists location_lng double precision;

comment on column public.vendors.location_lat is
  'خط العرض (WGS84) لنقطة التوزيع/المتجر.';
comment on column public.vendors.location_lng is
  'خط الطول (WGS84) لنقطة التوزيع/المتجر.';

-- متجر العرض الافتراضي (تل أبيب تقريباً) — عدّل بعد الدمج الحقيقي.
update public.vendors
set
  location_lat = 32.0853,
  location_lng = 34.7818
where id = '00000000-0000-0000-0000-000000000001';


-- END: migration_009_vendors_location.sql

-- ============================================================
-- BEGIN: migration_010_search_tsvector.sql
-- ============================================================

-- A4.5: Full-text search — tsvector على products (name, brand) و vendors (name, slug)
-- + فهرس GIN + دالة search_storefront للواجهة العامة.

-- ----------------------------------------------------------------------------
-- 1) أعمدة مولَّدة + فهارس GIN
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'search_vector'
  ) then
    alter table public.products
      add column search_vector tsvector
      generated always as (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A')
        || setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
      ) stored;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'search_vector'
  ) then
    alter table public.vendors
      add column search_vector tsvector
      generated always as (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A')
        || setweight(to_tsvector('simple', coalesce(slug, '')), 'B')
      ) stored;
  end if;
end $$;

create index if not exists idx_products_search_vector
  on public.products using gin (search_vector);

create index if not exists idx_vendors_search_vector
  on public.vendors using gin (search_vector);

comment on column public.products.search_vector is
  'Full-text vector (simple config) لـ name + brand — بحث الواجهة.';
comment on column public.vendors.search_vector is
  'Full-text vector (simple config) لـ name + slug — بحث الواجهة.';

-- ----------------------------------------------------------------------------
-- 2) RPC: نتائج JSON متوافقة مع mapVendor / mapProduct في التطبيق
-- ----------------------------------------------------------------------------

create or replace function public.search_storefront(
  search_query text,
  vendor_limit integer default 20,
  product_limit integer default 40
)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  q tsquery;
  q_trim text;
  vendors_json json;
  products_json json;
  vl integer := greatest(1, least(coalesce(vendor_limit, 20), 100));
  pl integer := greatest(1, least(coalesce(product_limit, 40), 200));
begin
  q_trim := left(trim(coalesce(search_query, '')), 200);
  if length(q_trim) = 0 then
    return json_build_object(
      'vendors', '[]'::json,
      'products', '[]'::json
    );
  end if;

  q := websearch_to_tsquery('simple', q_trim);
  if q is null or q = ''::tsquery then
    return json_build_object(
      'vendors', '[]'::json,
      'products', '[]'::json
    );
  end if;

  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into vendors_json
  from (
    select
      v.id,
      v.slug,
      v.name,
      v.description,
      v.logo_url,
      v.banner_url,
      v.category_id,
      v.vendor_category_id,
      v.default_prep_minutes,
      v.min_order_amount,
      v.delivery_fee_base
    from public.vendors v
    where v.is_active = true
      and v.search_vector @@ q
    order by ts_rank_cd(v.search_vector, q) desc
    limit vl
  ) t;

  select coalesce(json_agg(row_to_json(p)), '[]'::json)
  into products_json
  from (
    select
      pr.id,
      pr.name,
      pr.brand,
      pr.price,
      pr.old_price,
      pr.unit,
      pr.image,
      pr.badge,
      pr.category_id,
      pr.vendor_id,
      pr.vendor_category_id,
      pr.menu_category_id,
      pr.is_offer,
      pr.is_trending,
      pr.is_active,
      ven.name as vendor_name,
      ven.slug as vendor_slug
    from public.products pr
    inner join public.vendors ven on ven.id = pr.vendor_id
    where pr.is_active = true
      and ven.is_active = true
      and pr.search_vector @@ q
    order by ts_rank_cd(pr.search_vector, q) desc
    limit pl
  ) p;

  return json_build_object(
    'vendors', vendors_json,
    'products', products_json
  );
end;
$$;

comment on function public.search_storefront(text, integer, integer) is
  'بحث المتجر العام: متاجر ومنتجات نشطة عبر tsvector (simple).';

grant execute on function public.search_storefront(text, integer, integer)
  to anon, authenticated;


-- END: migration_010_search_tsvector.sql

-- ============================================================
-- BEGIN: migration_011_search_suggest.sql
-- ============================================================

-- A4.6: اقتراحات سريعة للشريط — نفس فهارس tsvector، نتائج خفيفة لـ autocomplete.

create or replace function public.search_storefront_suggest(
  search_query text,
  vendor_limit integer default 6,
  product_limit integer default 6
)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  q tsquery;
  q_trim text;
  vendors_json json;
  products_json json;
  vl integer := greatest(1, least(coalesce(vendor_limit, 6), 20));
  pl integer := greatest(1, least(coalesce(product_limit, 6), 20));
begin
  q_trim := left(trim(coalesce(search_query, '')), 120);
  if length(q_trim) < 2 then
    return json_build_object(
      'vendors', '[]'::json,
      'products', '[]'::json
    );
  end if;

  q := websearch_to_tsquery('simple', q_trim);
  if q is null or q = ''::tsquery then
    return json_build_object(
      'vendors', '[]'::json,
      'products', '[]'::json
    );
  end if;

  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into vendors_json
  from (
    select v.id, v.slug, v.name
    from public.vendors v
    where v.is_active = true
      and v.search_vector @@ q
    order by ts_rank_cd(v.search_vector, q) desc
    limit vl
  ) t;

  select coalesce(json_agg(row_to_json(p)), '[]'::json)
  into products_json
  from (
    select pr.id, pr.name, ven.slug as vendor_slug
    from public.products pr
    inner join public.vendors ven on ven.id = pr.vendor_id
    where pr.is_active = true
      and ven.is_active = true
      and pr.search_vector @@ q
    order by ts_rank_cd(pr.search_vector, q) desc
    limit pl
  ) p;

  return json_build_object(
    'vendors', vendors_json,
    'products', products_json
  );
end;
$$;

comment on function public.search_storefront_suggest(text, integer, integer) is
  'اقتراحات خفيفة للواجهة (شريط بحث): متاجر ومنتجات عبر tsvector.';

grant execute on function public.search_storefront_suggest(text, integer, integer)
  to anon, authenticated;


-- END: migration_011_search_suggest.sql

-- ============================================================
-- BEGIN: migration_012_favorites.sql
-- ============================================================

-- A4.7: مفضلة المستخدم — ربط منتج + متجر، RLS لمالك الجلسة فقط.

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_favorites_user on public.favorites (user_id);
create index if not exists idx_favorites_product on public.favorites (product_id);
create index if not exists idx_favorites_vendor on public.favorites (vendor_id);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites for select
using (user_id = auth.uid());

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites for insert
with check (user_id = auth.uid());

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites for delete
using (user_id = auth.uid());

comment on table public.favorites is
  'منتجات مفضّلة لكل مستخدم؛ vendor_id لنسخة من منتج للفلترة والتقارير.';


-- END: migration_012_favorites.sql

-- ============================================================
-- BEGIN: migration_013_onboarding_requests.sql
-- ============================================================

-- A2.2: onboarding requests for customer/vendor/driver sign-up flows.

create table if not exists public.onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_role text not null
    check (requested_role in ('customer', 'vendor_staff', 'driver')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  full_name text,
  phone text,
  vendor_name text,
  note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_onboarding_requests_user
  on public.onboarding_requests (user_id);

create index if not exists idx_onboarding_requests_status
  on public.onboarding_requests (status, created_at desc);

-- only one pending request per user+role
create unique index if not exists idx_onboarding_pending_unique
  on public.onboarding_requests (user_id, requested_role)
  where status = 'pending';

alter table public.onboarding_requests enable row level security;

drop policy if exists "onboarding_select_own" on public.onboarding_requests;
create policy "onboarding_select_own"
on public.onboarding_requests for select
using (user_id = auth.uid());

drop policy if exists "onboarding_insert_own" on public.onboarding_requests;
create policy "onboarding_insert_own"
on public.onboarding_requests for insert
with check (user_id = auth.uid());

drop policy if exists "onboarding_admin_select_all" on public.onboarding_requests;
create policy "onboarding_admin_select_all"
on public.onboarding_requests for select
using (public.is_platform_admin());

drop policy if exists "onboarding_admin_update_all" on public.onboarding_requests;
create policy "onboarding_admin_update_all"
on public.onboarding_requests for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

comment on table public.onboarding_requests is
  'طلبات انضمام المستخدمين (customer/vendor/driver) بانتظار موافقة الإدارة.';


-- END: migration_013_onboarding_requests.sql

-- ============================================================
-- BEGIN: migration_014_on_order_delivered_rpc.sql
-- ============================================================

-- B4.1: RPC to finalize delivered order financially.
-- Creates sales invoice once and credits vendor balance.
-- Inventory deduction is intentionally deferred until an inventory table exists.

create or replace function public.on_order_delivered(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  existing_invoice public.sales_invoices%rowtype;
  v_commission_pct numeric := 0; -- B4.2 will move this to platform_settings.
  v_platform_commission bigint := 0;
  v_net_vendor_amount bigint := 0;
begin
  select *
  into o
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if o.vendor_id is null then
    raise exception 'ORDER_VENDOR_MISSING';
  end if;

  if o.status <> 'delivered' then
    raise exception 'ORDER_NOT_DELIVERED';
  end if;

  select *
  into existing_invoice
  from public.sales_invoices
  where order_id = p_order_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'invoice_id', existing_invoice.id,
      'order_id', p_order_id
    );
  end if;

  v_platform_commission := round(o.total * v_commission_pct / 100.0)::bigint;
  v_net_vendor_amount := greatest(0, o.total - v_platform_commission);

  insert into public.sales_invoices (
    order_id,
    vendor_id,
    subtotal,
    delivery_fee,
    gross_total,
    platform_commission,
    net_vendor_amount,
    currency
  ) values (
    o.id,
    o.vendor_id,
    o.subtotal,
    o.delivery_fee,
    o.total,
    v_platform_commission,
    v_net_vendor_amount,
    'ILS'
  );

  insert into public.vendor_balances (vendor_id, available_amount, pending_amount, updated_at)
  values (o.vendor_id, v_net_vendor_amount, 0, now())
  on conflict (vendor_id)
  do update set
    available_amount = public.vendor_balances.available_amount + excluded.available_amount,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'already_processed', false,
    'order_id', p_order_id,
    'vendor_id', o.vendor_id,
    'net_vendor_amount', v_net_vendor_amount,
    'platform_commission', v_platform_commission
  );
end;
$$;

revoke all on function public.on_order_delivered(uuid) from public;
grant execute on function public.on_order_delivered(uuid) to authenticated, service_role;

comment on function public.on_order_delivered(uuid) is
  'B4.1: idempotent finalize of delivered order (sales invoice + vendor balance credit).';


-- END: migration_014_on_order_delivered_rpc.sql

-- ============================================================
-- BEGIN: migration_015_finance_commission_and_delivery_trigger.sql
-- ============================================================

-- B4.2 + B4.3
-- - platform_settings.commission_pct
-- - upgrade on_order_delivered() to use commission from settings
-- - trigger to auto-run on_order_delivered when order status becomes delivered

create table if not exists public.platform_settings (
  id boolean primary key default true,
  commission_pct numeric(5,2) not null default 0 check (commission_pct >= 0 and commission_pct <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = true)
);

insert into public.platform_settings (id, commission_pct)
values (true, 12)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_public_read" on public.platform_settings;
create policy "platform_settings_public_read"
on public.platform_settings for select
using (true);

drop policy if exists "platform_settings_admin_manage" on public.platform_settings;
create policy "platform_settings_admin_manage"
on public.platform_settings for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

create or replace function public.on_order_delivered(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  existing_invoice public.sales_invoices%rowtype;
  v_commission_pct numeric := 0;
  v_platform_commission bigint := 0;
  v_net_vendor_amount bigint := 0;
begin
  select *
  into o
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if o.vendor_id is null then
    raise exception 'ORDER_VENDOR_MISSING';
  end if;

  if o.status <> 'delivered' then
    raise exception 'ORDER_NOT_DELIVERED';
  end if;

  select *
  into existing_invoice
  from public.sales_invoices
  where order_id = p_order_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'invoice_id', existing_invoice.id,
      'order_id', p_order_id
    );
  end if;

  select coalesce(ps.commission_pct, 0)
  into v_commission_pct
  from public.platform_settings ps
  where ps.id = true;

  v_platform_commission := round(o.total * v_commission_pct / 100.0)::bigint;
  v_net_vendor_amount := greatest(0, o.total - v_platform_commission);

  insert into public.sales_invoices (
    order_id,
    vendor_id,
    subtotal,
    delivery_fee,
    gross_total,
    platform_commission,
    net_vendor_amount,
    currency
  ) values (
    o.id,
    o.vendor_id,
    o.subtotal,
    o.delivery_fee,
    o.total,
    v_platform_commission,
    v_net_vendor_amount,
    'ILS'
  );

  insert into public.vendor_balances (vendor_id, available_amount, pending_amount, updated_at)
  values (o.vendor_id, v_net_vendor_amount, 0, now())
  on conflict (vendor_id)
  do update set
    available_amount = public.vendor_balances.available_amount + excluded.available_amount,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'already_processed', false,
    'order_id', p_order_id,
    'vendor_id', o.vendor_id,
    'net_vendor_amount', v_net_vendor_amount,
    'platform_commission', v_platform_commission,
    'commission_pct', v_commission_pct
  );
end;
$$;

create or replace function public.trg_orders_on_delivered_finalize_finance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered' and coalesce(old.status, '') <> 'delivered' then
    perform public.on_order_delivered(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_on_delivered_finalize_finance on public.orders;
create trigger orders_on_delivered_finalize_finance
after update of status on public.orders
for each row
execute function public.trg_orders_on_delivered_finalize_finance();


-- END: migration_015_finance_commission_and_delivery_trigger.sql

-- ============================================================
-- BEGIN: migration_016_ratings.sql
-- ============================================================

-- C2.1: ratings table + RLS

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  driver_id text references public.delivery_drivers (id) on delete set null,
  vendor_rating integer not null check (vendor_rating between 1 and 5),
  driver_rating integer check (driver_rating is null or driver_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ratings_vendor on public.ratings (vendor_id);
create index if not exists idx_ratings_customer on public.ratings (customer_id);

alter table public.ratings enable row level security;

drop policy if exists "ratings_customer_rw_own" on public.ratings;
create policy "ratings_customer_rw_own"
on public.ratings for all
using (auth.uid() = customer_id)
with check (auth.uid() = customer_id);

drop policy if exists "ratings_vendor_select_own" on public.ratings;
create policy "ratings_vendor_select_own"
on public.ratings for select
using (public.is_vendor_staff(vendor_id));

drop policy if exists "ratings_platform_admin_all" on public.ratings;
create policy "ratings_platform_admin_all"
on public.ratings for all
using (public.is_platform_admin())
with check (public.is_platform_admin());


-- END: migration_016_ratings.sql

-- ============================================================
-- BEGIN: migration_017_coupons.sql
-- ============================================================

-- C3.1: coupons + apply_coupon RPC

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value bigint not null check (discount_value > 0),
  min_order_amount bigint not null default 0 check (min_order_amount >= 0),
  max_discount_amount bigint check (max_discount_amount is null or max_discount_amount >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount bigint not null default 0;

create or replace function public.apply_coupon(
  p_code text,
  p_subtotal bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_discount bigint := 0;
begin
  if p_subtotal < 0 then
    raise exception 'INVALID_SUBTOTAL';
  end if;

  select *
  into c
  from public.coupons
  where upper(code) = upper(trim(p_code))
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'COUPON_NOT_FOUND');
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('ok', false, 'error', 'COUPON_NOT_STARTED');
  end if;
  if c.expires_at is not null and now() > c.expires_at then
    return jsonb_build_object('ok', false, 'error', 'COUPON_EXPIRED');
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('ok', false, 'error', 'COUPON_USAGE_LIMIT_REACHED');
  end if;
  if p_subtotal < c.min_order_amount then
    return jsonb_build_object('ok', false, 'error', 'COUPON_MIN_ORDER_NOT_MET');
  end if;

  if c.discount_type = 'percent' then
    v_discount := round(p_subtotal * c.discount_value / 100.0)::bigint;
  else
    v_discount := c.discount_value;
  end if;

  if c.max_discount_amount is not null then
    v_discount := least(v_discount, c.max_discount_amount);
  end if;
  v_discount := greatest(0, least(v_discount, p_subtotal));

  return jsonb_build_object(
    'ok', true,
    'code', c.code,
    'discount_amount', v_discount
  );
end;
$$;

revoke all on function public.apply_coupon(text, bigint) from public;
grant execute on function public.apply_coupon(text, bigint) to authenticated, service_role;


-- END: migration_017_coupons.sql

-- ============================================================
-- BEGIN: migration_018_push_subscriptions.sql
-- ============================================================

-- C4.1: push subscriptions

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_user_rw_own" on public.push_subscriptions;
create policy "push_subscriptions_user_rw_own"
on public.push_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_platform_admin_all" on public.push_subscriptions;
create policy "push_subscriptions_platform_admin_all"
on public.push_subscriptions for all
using (public.is_platform_admin())
with check (public.is_platform_admin());


-- END: migration_018_push_subscriptions.sql

-- ============================================================
-- BEGIN: migration_019_vendor_workspace_extras.sql
-- ============================================================

-- migration_019_vendor_workspace_extras.sql
-- Adds vendor-side bookkeeping tables (manual sales/purchase invoices,
-- suppliers, inventory, walk-in customer ledger) so the vendor dashboard
-- can replace the legacy /erp pages.

-- =============================================================
-- Per-vendor commission + manual open/close + per-km delivery + address text
-- + global platform settings
-- =============================================================
alter table public.vendors
  add column if not exists commission_rate numeric(5,2) not null default 10.00;
alter table public.vendors
  add column if not exists is_open boolean not null default true;
alter table public.vendors
  add column if not exists delivery_fee_per_km bigint not null default 0;
alter table public.vendors
  add column if not exists address_text text;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin_all on public.platform_settings;
create policy platform_settings_admin_all on public.platform_settings
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read on public.platform_settings
  for select using (true);


-- =============================================================
-- vendor_inventory: per-vendor stock for products
-- =============================================================
create table if not exists public.vendor_inventory (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  cost_price bigint not null default 0,
  unit text,
  updated_at timestamptz not null default now(),
  unique (vendor_id, product_id)
);

create index if not exists idx_vendor_inventory_vendor on public.vendor_inventory(vendor_id);
alter table public.vendor_inventory enable row level security;

drop policy if exists vendor_inventory_select on public.vendor_inventory;
create policy vendor_inventory_select on public.vendor_inventory
  for select using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_inventory.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

drop policy if exists vendor_inventory_modify on public.vendor_inventory;
create policy vendor_inventory_modify on public.vendor_inventory
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_inventory.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_inventory.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- =============================================================
-- vendor_suppliers
-- =============================================================
create table if not exists public.vendor_suppliers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_suppliers_vendor on public.vendor_suppliers(vendor_id);
alter table public.vendor_suppliers enable row level security;

drop policy if exists vendor_suppliers_all on public.vendor_suppliers;
create policy vendor_suppliers_all on public.vendor_suppliers
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_suppliers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_suppliers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- =============================================================
-- vendor_customers (walk-in / external customers ledger)
-- =============================================================
create table if not exists public.vendor_customers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  balance bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_customers_vendor on public.vendor_customers(vendor_id);
alter table public.vendor_customers enable row level security;

drop policy if exists vendor_customers_all on public.vendor_customers;
create policy vendor_customers_all on public.vendor_customers
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_customers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_customers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

create table if not exists public.vendor_customer_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.vendor_customers(id) on delete cascade,
  type text not null check (type in ('debt','payment')),
  amount bigint not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_customer_tx_customer on public.vendor_customer_transactions(customer_id);
alter table public.vendor_customer_transactions enable row level security;

drop policy if exists vendor_customer_tx_all on public.vendor_customer_transactions;
create policy vendor_customer_tx_all on public.vendor_customer_transactions
  for all using (
    exists (
      select 1
      from public.vendor_customers c
      join public.vendor_staff vs on vs.vendor_id = c.vendor_id
      where c.id = vendor_customer_transactions.customer_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1
      from public.vendor_customers c
      join public.vendor_staff vs on vs.vendor_id = c.vendor_id
      where c.id = vendor_customer_transactions.customer_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- Trigger keeps balance in sync.
create or replace function public.vendor_customer_tx_apply()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.vendor_customers
       set balance = balance + (case when NEW.type = 'debt' then NEW.amount else -NEW.amount end)
     where id = NEW.customer_id;
    return NEW;
  end if;
  if (TG_OP = 'DELETE') then
    update public.vendor_customers
       set balance = balance - (case when OLD.type = 'debt' then OLD.amount else -OLD.amount end)
     where id = OLD.customer_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_vendor_customer_tx_apply on public.vendor_customer_transactions;
create trigger trg_vendor_customer_tx_apply
  after insert or delete on public.vendor_customer_transactions
  for each row execute function public.vendor_customer_tx_apply();

-- =============================================================
-- vendor_sales_invoices (manual / walk-in)
-- =============================================================
create table if not exists public.vendor_sales_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  customer_id uuid references public.vendor_customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','credit')),
  subtotal bigint not null default 0,
  discount bigint not null default 0,
  total bigint not null default 0,
  note text,
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_vendor_sales_invoices_vendor on public.vendor_sales_invoices(vendor_id);
alter table public.vendor_sales_invoices enable row level security;

drop policy if exists vendor_sales_invoices_all on public.vendor_sales_invoices;
create policy vendor_sales_invoices_all on public.vendor_sales_invoices
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_sales_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_sales_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

create table if not exists public.vendor_sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.vendor_sales_invoices(id) on delete cascade,
  product_id text references public.products(id),
  name_snapshot text not null,
  qty numeric not null,
  unit_price bigint not null,
  total bigint not null
);
create index if not exists idx_vendor_sales_invoice_items_invoice on public.vendor_sales_invoice_items(invoice_id);
alter table public.vendor_sales_invoice_items enable row level security;

drop policy if exists vendor_sales_invoice_items_all on public.vendor_sales_invoice_items;
create policy vendor_sales_invoice_items_all on public.vendor_sales_invoice_items
  for all using (
    exists (
      select 1
      from public.vendor_sales_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_sales_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1
      from public.vendor_sales_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_sales_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- =============================================================
-- vendor_purchase_invoices
-- =============================================================
create table if not exists public.vendor_purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  supplier_id uuid references public.vendor_suppliers(id) on delete set null,
  total bigint not null default 0,
  paid bigint not null default 0,
  status text not null default 'unpaid' check (status in ('paid','partial','unpaid')),
  note text,
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_vendor_purchase_invoices_vendor on public.vendor_purchase_invoices(vendor_id);
alter table public.vendor_purchase_invoices enable row level security;

drop policy if exists vendor_purchase_invoices_all on public.vendor_purchase_invoices;
create policy vendor_purchase_invoices_all on public.vendor_purchase_invoices
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_purchase_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_purchase_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

create table if not exists public.vendor_purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.vendor_purchase_invoices(id) on delete cascade,
  product_id text references public.products(id),
  name_snapshot text not null,
  qty numeric not null,
  unit_cost bigint not null,
  total bigint not null
);
create index if not exists idx_vendor_purchase_invoice_items_invoice on public.vendor_purchase_invoice_items(invoice_id);
alter table public.vendor_purchase_invoice_items enable row level security;

drop policy if exists vendor_purchase_invoice_items_all on public.vendor_purchase_invoice_items;
create policy vendor_purchase_invoice_items_all on public.vendor_purchase_invoice_items
  for all using (
    exists (
      select 1
      from public.vendor_purchase_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_purchase_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1
      from public.vendor_purchase_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_purchase_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- When a purchase invoice item is inserted, increment vendor_inventory.stock automatically.
create or replace function public.vendor_purchase_item_apply()
returns trigger
language plpgsql
as $$
declare
  v_vendor uuid;
begin
  if (NEW.product_id is null) then
    return NEW;
  end if;
  select vendor_id into v_vendor
  from public.vendor_purchase_invoices
  where id = NEW.invoice_id;

  if v_vendor is null then
    return NEW;
  end if;

  insert into public.vendor_inventory (vendor_id, product_id, stock, cost_price)
  values (v_vendor, NEW.product_id, NEW.qty, NEW.unit_cost)
  on conflict (vendor_id, product_id) do update
    set stock = vendor_inventory.stock + EXCLUDED.stock,
        cost_price = EXCLUDED.cost_price,
        updated_at = now();

  return NEW;
end;
$$;

drop trigger if exists trg_vendor_purchase_item_apply on public.vendor_purchase_invoice_items;
create trigger trg_vendor_purchase_item_apply
  after insert on public.vendor_purchase_invoice_items
  for each row execute function public.vendor_purchase_item_apply();

-- When a sales invoice item is inserted, decrement vendor_inventory.stock when product is tracked.
create or replace function public.vendor_sales_item_apply()
returns trigger
language plpgsql
as $$
declare
  v_vendor uuid;
begin
  if (NEW.product_id is null) then
    return NEW;
  end if;
  select vendor_id into v_vendor
  from public.vendor_sales_invoices
  where id = NEW.invoice_id;
  if v_vendor is null then
    return NEW;
  end if;

  update public.vendor_inventory
     set stock = stock - NEW.qty,
         updated_at = now()
   where vendor_id = v_vendor and product_id = NEW.product_id;

  return NEW;
end;
$$;

drop trigger if exists trg_vendor_sales_item_apply on public.vendor_sales_invoice_items;
create trigger trg_vendor_sales_item_apply
  after insert on public.vendor_sales_invoice_items
  for each row execute function public.vendor_sales_item_apply();


-- END: migration_019_vendor_workspace_extras.sql
