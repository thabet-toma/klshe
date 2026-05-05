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
