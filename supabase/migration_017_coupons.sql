-- C3.1: coupons + apply_coupon RPC

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value bigint not null check (discount_value > 0),
  min_order_amount bigint not null default 0 check (min_order_amount >= 0),
  max_discount_amount bigint check (max_discount_amount is null or max_discount_amount >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount bigint not null default 0;

create or replace function public.apply_coupon(
  p_code text,
  p_subtotal bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_discount bigint := 0;
begin
  if p_subtotal < 0 then
    raise exception 'INVALID_SUBTOTAL';
  end if;

  select *
  into c
  from public.coupons
  where upper(code) = upper(trim(p_code))
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'COUPON_NOT_FOUND');
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('ok', false, 'error', 'COUPON_NOT_STARTED');
  end if;
  if c.expires_at is not null and now() > c.expires_at then
    return jsonb_build_object('ok', false, 'error', 'COUPON_EXPIRED');
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('ok', false, 'error', 'COUPON_USAGE_LIMIT_REACHED');
  end if;
  if p_subtotal < c.min_order_amount then
    return jsonb_build_object('ok', false, 'error', 'COUPON_MIN_ORDER_NOT_MET');
  end if;

  if c.discount_type = 'percent' then
    v_discount := round(p_subtotal * c.discount_value / 100.0)::bigint;
  else
    v_discount := c.discount_value;
  end if;

  if c.max_discount_amount is not null then
    v_discount := least(v_discount, c.max_discount_amount);
  end if;
  v_discount := greatest(0, least(v_discount, p_subtotal));

  return jsonb_build_object(
    'ok', true,
    'code', c.code,
    'discount_amount', v_discount
  );
end;
$$;

revoke all on function public.apply_coupon(text, bigint) from public;
grant execute on function public.apply_coupon(text, bigint) to authenticated, service_role;
