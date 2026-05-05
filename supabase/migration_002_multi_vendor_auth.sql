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
