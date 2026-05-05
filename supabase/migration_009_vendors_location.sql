-- مواقع المتاجر للترتيب بالمسافة (Haversine من التطبيق أو استعلام لاحق).
-- لا يتطلب PostGIS؛ يتوافق مع خطة «earthdistance» كمسافة جوّية تقريبية.

alter table public.vendors
  add column if not exists location_lat double precision;

alter table public.vendors
  add column if not exists location_lng double precision;

comment on column public.vendors.location_lat is
  'خط العرض (WGS84) لنقطة التوزيع/المتجر.';
comment on column public.vendors.location_lng is
  'خط الطول (WGS84) لنقطة التوزيع/المتجر.';

-- متجر العرض الافتراضي (تل أبيب تقريباً) — عدّل بعد الدمج الحقيقي.
update public.vendors
set
  location_lat = 32.0853,
  location_lng = 34.7818
where id = '00000000-0000-0000-0000-000000000001';
