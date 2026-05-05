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
