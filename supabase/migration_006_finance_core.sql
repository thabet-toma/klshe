-- المرحلة A1.6: أساس مالي احترافي للمتاجر
-- - vendor_balances: رصيد كل متجر
-- - payouts: طلبات/دفعات السحب
-- - sales_invoices: فواتير البيع لكل طلب
--
-- ملاحظة: هذا Migration يؤسس الجداول والسياسات.
-- منطق الترحيل/التحديث التلقائي عند delivered سيأتي في B4.

create table if not exists public.vendor_balances (
  vendor_id uuid primary key references public.vendors (id) on delete cascade,
  available_amount numeric(12,2) not null default 0 check (available_amount >= 0),
  pending_amount numeric(12,2) not null default 0 check (pending_amount >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'paid', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  requested_by uuid references auth.users (id) on delete set null,
  note text
);

create index if not exists idx_payouts_vendor on public.payouts (vendor_id);
create index if not exists idx_payouts_status on public.payouts (status);
create index if not exists idx_payouts_requested_at on public.payouts (requested_at desc);

create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  gross_total numeric(12,2) not null check (gross_total >= 0),
  platform_commission numeric(12,2) not null default 0 check (platform_commission >= 0),
  net_vendor_amount numeric(12,2) not null check (net_vendor_amount >= 0),
  currency text not null default 'ILS',
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_invoices_vendor on public.sales_invoices (vendor_id);
create index if not exists idx_sales_invoices_created on public.sales_invoices (created_at desc);

-- تهيئة أرصدة للمتاجر الحالية
insert into public.vendor_balances (vendor_id)
select v.id
from public.vendors v
where not exists (
  select 1 from public.vendor_balances vb where vb.vendor_id = v.id
);

alter table public.vendor_balances enable row level security;
alter table public.payouts enable row level security;
alter table public.sales_invoices enable row level security;

-- vendor_balances: قراءة لصاحب المتجر + platform admin
drop policy if exists "vendor_balances_vendor_select_own" on public.vendor_balances;
create policy "vendor_balances_vendor_select_own"
on public.vendor_balances for select
using (public.is_vendor_staff(vendor_id));

drop policy if exists "vendor_balances_platform_admin_all" on public.vendor_balances;
create policy "vendor_balances_platform_admin_all"
on public.vendor_balances for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- payouts: vendor يطلب/يرى متجَره + platform admin يدير
drop policy if exists "payouts_vendor_rw_own" on public.payouts;
create policy "payouts_vendor_rw_own"
on public.payouts for all
using (public.is_vendor_staff(vendor_id))
with check (public.is_vendor_staff(vendor_id));

drop policy if exists "payouts_platform_admin_all" on public.payouts;
create policy "payouts_platform_admin_all"
on public.payouts for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- sales_invoices: vendor قراءة فقط + platform admin كل شيء
drop policy if exists "sales_invoices_vendor_select_own" on public.sales_invoices;
create policy "sales_invoices_vendor_select_own"
on public.sales_invoices for select
using (public.is_vendor_staff(vendor_id));

drop policy if exists "sales_invoices_platform_admin_all" on public.sales_invoices;
create policy "sales_invoices_platform_admin_all"
on public.sales_invoices for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

comment on table public.vendor_balances is
  'رصيد كل متجر (available/pending) لدعم التقاص والسحب.';
comment on table public.payouts is
  'طلبات سحب وتحويل رصيد المتجر.';
comment on table public.sales_invoices is
  'فاتورة مبيعات لكل طلب مكتمل تتضمن عمولة المنصة وصافي المتجر.';

-- تحويل أغورة (يجب أن يأتي بعد إنشاء الجداول؛ كان في migration_005 قبل الإنشاء فيخطأ bootstrap)
alter table public.vendor_balances
  alter column available_amount
  type bigint
  using round(available_amount * 100)::bigint;

alter table public.vendor_balances
  alter column pending_amount
  type bigint
  using round(pending_amount * 100)::bigint;

alter table public.payouts
  alter column amount
  type bigint
  using round(amount * 100)::bigint;

alter table public.sales_invoices
  alter column subtotal
  type bigint
  using round(subtotal * 100)::bigint;

alter table public.sales_invoices
  alter column delivery_fee
  type bigint
  using round(delivery_fee * 100)::bigint;

alter table public.sales_invoices
  alter column gross_total
  type bigint
  using round(gross_total * 100)::bigint;

alter table public.sales_invoices
  alter column platform_commission
  type bigint
  using round(platform_commission * 100)::bigint;

alter table public.sales_invoices
  alter column net_vendor_amount
  type bigint
  using round(net_vendor_amount * 100)::bigint;
