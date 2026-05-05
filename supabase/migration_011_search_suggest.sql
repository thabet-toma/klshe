-- A4.6: اقتراحات سريعة للشريط — نفس فهارس tsvector، نتائج خفيفة لـ autocomplete.

create or replace function public.search_storefront_suggest(
  search_query text,
  vendor_limit integer default 6,
  product_limit integer default 6
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
  vl integer := greatest(1, least(coalesce(vendor_limit, 6), 20));
  pl integer := greatest(1, least(coalesce(product_limit, 6), 20));
begin
  q_trim := left(trim(coalesce(search_query, '')), 120);
  if length(q_trim) < 2 then
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
    select v.id, v.slug, v.name
    from public.vendors v
    where v.is_active = true
      and v.search_vector @@ q
    order by ts_rank_cd(v.search_vector, q) desc
    limit vl
  ) t;

  select coalesce(json_agg(row_to_json(p)), '[]'::json)
  into products_json
  from (
    select pr.id, pr.name, ven.slug as vendor_slug
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

comment on function public.search_storefront_suggest(text, integer, integer) is
  'اقتراحات خفيفة للواجهة (شريط بحث): متاجر ومنتجات عبر tsvector.';

grant execute on function public.search_storefront_suggest(text, integer, integer)
  to anon, authenticated;
