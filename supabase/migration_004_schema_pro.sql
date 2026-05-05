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

