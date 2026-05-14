-- Broadcast & Claim System Migration
-- This migration updates the orders table to support the new broadcast and claim workflow
-- where orders are broadcasted to all drivers and the first driver to claim an order gets it

-- Add new status 'broadcast' to the order status check constraint
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

-- Update the status check constraint to include 'broadcast' status
alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'broadcast', 'accepted', 'preparing', 'ready', 'dispatched', 'on_way', 'delivered', 'cancelled', 'rejected'));

-- Add fields for tracking order claims
alter table public.orders
  add column if not exists broadcast_at timestamptz;

alter table public.orders
  add column if not exists claimed_at timestamptz;

alter table public.orders
  add column if not exists claimed_by uuid references public.delivery_drivers(id);

-- Add index for efficient querying of broadcasted orders
create index if not exists idx_orders_broadcast_status 
  on public.orders (status, created_at) 
  where status = 'broadcast';

-- Add index for claimed orders tracking
create index if not exists idx_orders_claimed_by 
  on public.orders (claimed_by, claimed_at) 
  where claimed_by is not null;

-- Create function to safely claim an order with transaction handling
create or replace function public.claim_order(p_order_id uuid, p_driver_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := p_order_id;
  v_driver_id text := p_driver_id;
  v_order_status text;
  v_broadcast_at timestamptz;
  v_already_claimed boolean := false;
  v_driver_uuid uuid;
begin
  -- Get the driver's UUID from the delivery_drivers table
  select id into v_driver_uuid
  from public.delivery_drivers
  where public.delivery_drivers.id = v_driver_id::text
    and public.delivery_drivers.is_active = true;
  
  if v_driver_uuid is null then
    return jsonb_build_object('success', false, 'error', 'DRIVER_NOT_FOUND_OR_INACTIVE');
  end if;
  
  -- Lock the order for update to prevent race conditions
  select status, broadcast_at into v_order_status, v_broadcast_at
  from public.orders
  where id = v_order_id
  for update;
  
  if not found then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  end if;
  
  -- Check if order is in broadcast status
  if v_order_status != 'broadcast' then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_AVAILABLE_FOR_CLAIM', 'current_status', v_order_status);
  end if;
  
  -- Check if order was already claimed (double check for race conditions)
  if claimed_by is not null then
    select 1 into v_already_claimed
    from public.orders
    where id = v_order_id 
      and claimed_by is not null;
    
    if v_already_claimed then
      return jsonb_build_object('success', false, 'error', 'ORDER_ALREADY_CLAIMED');
    end if;
  end if;
  
  -- Claim the order in a single transaction
  update public.orders
  set 
    driver_id = v_driver_uuid,
    status = 'dispatched',
    claimed_at = now(),
    claimed_by = v_driver_uuid
  where id = v_order_id
    and status = 'broadcast'
    and claimed_by is null;
  
  -- Check if the update was successful
  if not found then
    return jsonb_build_object('success', false, 'error', 'ORDER_CLAIM_FAILED');
  end if;
  
  -- Log the successful claim
  perform public.log_order_claim(v_order_id, v_driver_uuid, now(), 'SUCCESS');
  
  -- Return success with order details
  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'driver_id', v_driver_uuid,
    'claimed_at', now(),
    'new_status', 'dispatched'
  );
  
exception
  when others then
    -- Log the failed claim attempt
    perform public.log_order_claim(v_order_id, coalesce(v_driver_uuid, null::uuid), now(), SQLERRM);
    
    -- Re-raise the exception for the calling code to handle
    raise;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.claim_order to authenticated;

-- Create view for broadcasted orders
create or replace view public.broadcasted_orders as
select 
  id,
  short_code,
  customer_name,
  customer_phone,
  customer_address,
  total,
  payment_method,
  notes,
  broadcast_at,
  created_at,
  vendors (
    id,
    name,
    slug
  ),
  order_items (
    id,
    product_name,
    quantity,
    line_total
  )
from public.orders
where status = 'broadcast'
order by broadcast_at asc nulls last, created_at asc;

-- Grant select permission on broadcasted orders view to authenticated users
grant select on public.broadcasted_orders to authenticated;

-- Add comments to document the new fields
comment on column public.orders.broadcast_at is 'Timestamp when order was broadcasted to drivers';
comment on column public.orders.claimed_at is 'Timestamp when order was claimed by a driver';
comment on column public.orders.claimed_by is 'Reference to the driver who claimed the order (delivery_drivers.id)';

-- Update comments on the orders table
comment on table public.orders is 'Orders table with broadcast & claim system. Orders are first broadcasted and then claimed by drivers.';