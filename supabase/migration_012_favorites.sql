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
