-- migration_025: خصم مخزون ذرّي (يمنع السالب والتسابق) — T2.7
-- يستبدل منطق read-then-write في app/api/orders/route.ts بتحديث شرطي ذرّي.
-- vendor_inventory الحيّ: (id uuid, vendor_id uuid, product_id text, stock numeric, ...)

create or replace function public.decrement_inventory(
  p_vendor_id uuid,
  p_product_id text,
  p_qty numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_stock numeric;
begin
  -- تحديث شرطي ذرّي: لا يخصم إلا إذا كان المخزون كافياً (يمنع السالب والتسابق)
  update public.vendor_inventory
     set stock = stock - p_qty, updated_at = now()
   where vendor_id = p_vendor_id
     and product_id = p_product_id
     and stock >= p_qty
  returning stock into v_stock;

  if found then
    return jsonb_build_object('tracked', true, 'success', true, 'stock', v_stock);
  end if;

  -- لم يُحدَّث أي صفّ: إمّا المنتج غير متتبَّع (لا صفّ) أو المخزون غير كافٍ
  if not exists (
    select 1 from public.vendor_inventory
    where vendor_id = p_vendor_id and product_id = p_product_id
  ) then
    return jsonb_build_object('tracked', false);
  end if;

  return jsonb_build_object('tracked', true, 'success', false, 'error', 'INSUFFICIENT_STOCK');
end; $$;

grant execute on function public.decrement_inventory(uuid, text, numeric) to authenticated, service_role;
