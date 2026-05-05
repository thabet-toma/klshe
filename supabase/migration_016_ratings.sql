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
