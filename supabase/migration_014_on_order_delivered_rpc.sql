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
