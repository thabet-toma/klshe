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
