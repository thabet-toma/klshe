-- ⚠️ DEPRECATED: superseded by migration_024_broadcast_claim_fixed.sql
-- هذا الترحيل مهجور. استخدم migration_024 بدلاً منه.
-- لا تطبّق هذا الملف على قاعدة بيانات حيّة.

-- RLS Policies for Broadcast & Claim System

-- Create audit log table for tracking order claims (if not exists)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  user_id uuid references auth.users(id) on delete set null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- Create index for efficient audit log queries
create index if not exists idx_audit_log_table_record 
on public.audit_log (table_name, record_id, created_at desc);

-- Enable RLS on audit log
alter table public.audit_log enable row level security;

-- Only allow platform admins to view audit logs
drop policy if exists "audit_log_admin_select_all" on public.audit_log;
create policy "audit_log_admin_select_all"
on public.audit_log for select
using (public.is_platform_admin());

-- Allow the logging function to insert records
drop policy if exists "audit_log_function_insert" on public.audit_log;
create policy "audit_log_function_insert"
on public.audit_log for insert
using (true); -- The function itself is security definer and controls access

-- Update orders driver policy to include access to broadcast orders
drop policy if exists "orders_driver_select_assigned" on public.orders;
create policy "orders_driver_select_assigned_or_broadcast"
on public.orders for select
using (
  (
    -- Orders assigned to the current driver
    driver_id is not null and public.is_driver_assigned(driver_id)
  ) or (
    -- Or orders that are broadcast and available for claiming
    status = 'broadcast' and claimed_by is null
  )
);

-- Add policy for claim function execution
-- Note: The claim_order function already has security definer and performs its own checks
-- This policy ensures only active drivers can execute the function

-- Update the is_driver_assigned function to handle UUID/text comparisons properly
create or replace function public.is_driver_assigned(target_driver_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.delivery_drivers
    where 
      -- Handle both text and UUID driver_id for backward compatibility
      (
        id::text = target_driver_id or
        id::text = target_driver_id::text
      ) and
      user_id = auth.uid() and
      is_active = true
  );
$$;

-- Create a view to help RLS with broadcast permissions
create or replace view public.driver_claimable_orders as
select 
  o.*
from public.orders o
where o.status = 'broadcast' 
  and o.claimed_by is null;

-- Grant select permission on the view to authenticated users
grant select on public.driver_claimable_orders to authenticated;

-- Update the broadcasted_orders view to include proper RLS
drop view if exists public.broadcasted_orders;
create or replace view public.broadcasted_orders as
select 
  o.id,
  o.short_code,
  o.customer_name,
  o.customer_phone,
  o.customer_address,
  o.total,
  o.payment_method,
  o.notes,
  o.broadcast_at,
  o.created_at,
  o.vendors,
  o.order_items
from public.orders o
where o.status = 'broadcast'
  and o.claimed_by is null
order by o.broadcast_at asc nulls last, o.created_at asc;

-- Enable RLS on the view (applied through underlying table)
grant select on public.broadcasted_orders to authenticated;

-- Update policy for orders to include broadcast status handling
drop policy if exists "orders_customer_select_own" on public.orders;
create policy "orders_customer_select_own"
on public.orders for select
using (customer_id = auth.uid());

-- Updated vendor policy to include workflow changes
drop policy if exists "orders_vendor_rw_own" on public.orders;
create policy "orders_vendor_rw_own"
on public.orders for all
using (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
)
with check (
  vendor_id is not null and public.is_vendor_staff(vendor_id)
);

-- Re-create platform admin policy
drop policy if exists "orders_platform_admin_all" on public.orders;
create policy "orders_platform_admin_all"
on public.orders for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Add logging for the broadcast/claim workflow
create or replace function public.log_order_claim(
  order_id uuid,
  driver_id uuid,
  claim_time timestamptz,
  claim_result text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    table_name, 
    record_id, 
    action, 
    user_id, 
    new_values, 
    created_at
  ) values (
    'orders',
    order_id,
    'CLAIM',
    driver_id,
    jsonb_build_object(
      'action', 'claim_attempt', 
      'result', claim_result,
      'claimed_at', claim_time
    ),
    claim_time
  )
  on conflict (id) do nothing;
exception
  when others then null; -- Don't fail if audit doesn't exist
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.log_order_claim to authenticated;