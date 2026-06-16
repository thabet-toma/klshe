-- M3: فلتر «مفتوح الآن» في البحث — أضف v.is_open إلى نتائج المتاجر في search_storefront.
-- إعادة تعريف الدالة كاملةً (لا تعدّل migration_010 القديم) مع إضافة العمود فقط.

create or replace function public.search_storefront(
  search_query text,
  vendor_limit integer default 20,
  product_limit integer default 40
)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  q tsquery;
  q_trim text;
  vendors_json json;
  products_json json;
  vl integer := greatest(1, least(coalesce(vendor_limit, 20), 100));
  pl integer := greatest(1, least(coalesce(product_limit, 40), 200));
begin
  q_trim := left(trim(coalesce(search_query, '')), 200);
  if length(q_trim) = 0 then
    return json_build_object(
      'vendors', '[]'::json,
      'products', '[]'::json
    );
  end if;

  q := websearch_to_tsquery('simple', q_trim);
  if q is null or q = ''::tsquery then
    return json_build_object(
      'vendors', '[]'::json,
      'products', '[]'::json
    );
  end if;

  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into vendors_json
  from (
    select
      v.id,
      v.slug,
      v.name,
      v.description,
      v.logo_url,
      v.banner_url,
      v.category_id,
      v.vendor_category_id,
      v.default_prep_minutes,
      v.min_order_amount,
      v.delivery_fee_base,
      v.is_open
    from public.vendors v
    where v.is_active = true
      and v.search_vector @@ q
    order by ts_rank_cd(v.search_vector, q) desc
    limit vl
  ) t;

  select coalesce(json_agg(row_to_json(p)), '[]'::json)
  into products_json
  from (
    select
      pr.id,
      pr.name,
      pr.brand,
      pr.price,
      pr.old_price,
      pr.unit,
      pr.image,
      pr.badge,
      pr.category_id,
      pr.vendor_id,
      pr.vendor_category_id,
      pr.menu_category_id,
      pr.is_offer,
      pr.is_trending,
      pr.is_active,
      ven.name as vendor_name,
      ven.slug as vendor_slug
    from public.products pr
    inner join public.vendors ven on ven.id = pr.vendor_id
    where pr.is_active = true
      and ven.is_active = true
      and pr.search_vector @@ q
    order by ts_rank_cd(pr.search_vector, q) desc
    limit pl
  ) p;

  return json_build_object(
    'vendors', vendors_json,
    'products', products_json
  );
end;
$$;

grant execute on function public.search_storefront(text, integer, integer)
  to anon, authenticated;
