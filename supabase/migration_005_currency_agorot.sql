-- المرحلة A6.1: توحيد تخزين العملة بالأغورة (integer / bigint)
-- يشمل تحويل الحقول النقدية من numeric(12,2) إلى bigint مع ضرب ×100.
-- ملاحظة: افترض أن القيم القديمة بالشيكل. بعد هذا الملف تصبح القيم بالأغورة.

-- vendors
alter table public.vendors
  alter column min_order_amount
  type bigint
  using round(min_order_amount * 100)::bigint;

alter table public.vendors
  alter column delivery_fee_base
  type bigint
  using round(delivery_fee_base * 100)::bigint;

alter table public.vendors
  add constraint vendors_min_order_amount_non_negative
    check (min_order_amount >= 0);

alter table public.vendors
  add constraint vendors_delivery_fee_base_non_negative
    check (delivery_fee_base >= 0);

-- products
alter table public.products
  alter column price
  type bigint
  using round(price * 100)::bigint;

alter table public.products
  alter column old_price
  type bigint
  using case when old_price is null then null else round(old_price * 100)::bigint end;

-- orders
alter table public.orders
  alter column subtotal
  type bigint
  using round(subtotal * 100)::bigint;

alter table public.orders
  alter column delivery_fee
  type bigint
  using round(delivery_fee * 100)::bigint;

alter table public.orders
  alter column total
  type bigint
  using round(total * 100)::bigint;

-- order_items
alter table public.order_items
  alter column unit_price
  type bigint
  using round(unit_price * 100)::bigint;

alter table public.order_items
  alter column line_total
  type bigint
  using round(line_total * 100)::bigint;

-- transactions
alter table public.transactions
  alter column amount
  type bigint
  using round(amount * 100)::bigint;

-- delivery_drivers
alter table public.delivery_drivers
  alter column earnings_today
  type bigint
  using round(earnings_today * 100)::bigint;

-- ملاحظة: vendor_balances / payouts / sales_invoices تُنشأ في migration_006_finance_core.sql
-- تحويل أغورتها يتم هناك بعد الإنشاء مباشرةً حتى لا يُستدعى هذا الملف قبل وجود الجداول.

comment on table public.orders is
  'جميع القيم النقدية (subtotal/delivery_fee/total) مخزنة بالأغورة bigint.';
comment on table public.products is
  'price/old_price مخزنة بالأغورة bigint.';
