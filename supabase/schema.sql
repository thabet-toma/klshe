-- Run this file inside Supabase SQL Editor.
-- It creates core tables for storefront + logistics + ERP-lite.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  full_name text not null,
  role text not null check (role in ('customer', 'admin', 'driver')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  emoji text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price >= 0),
  unit text not null,
  image text not null,
  badge text check (badge in ('خصم', 'جديد', 'الأكثر مبيعاً')),
  category_id text not null references public.categories(id) on delete restrict,
  is_offer boolean not null default false,
  is_trending boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  short_code text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  location_lat double precision,
  location_lng double precision,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'new'
    check (status in ('new', 'preparing', 'dispatched', 'on_way', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('cash', 'card')),
  notes text,
  driver_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null default 'sale' check (type in ('sale', 'purchase', 'payment', 'receipt')),
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text not null check (payment_method in ('cash', 'card')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_offer on public.products(is_offer);
create index if not exists idx_products_trending on public.products(is_trending);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_transactions_order on public.transactions(order_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories"
on public.categories for select
using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products"
on public.products for select
using (is_active = true);

-- Write operations should happen from server (service role key).
-- service_role bypasses RLS automatically.

insert into public.categories (id, name, emoji, color) values
('c1','بقالة','🛒','from-orange-100 to-orange-200'),
('c2','مطاعم','🍔','from-rose-100 to-rose-200'),
('c3','خضار وفواكه','🥬','from-lime-100 to-emerald-200'),
('c4','حلويات','🍰','from-pink-100 to-fuchsia-200'),
('c6','مشروبات','🥤','from-sky-100 to-indigo-200'),
('c9','ألبان وأجبان','🧀','from-yellow-100 to-amber-200')
on conflict (id) do nothing;

insert into public.products (
  id, name, brand, price, old_price, unit, image, badge, category_id, is_offer, is_trending
) values
('p1','تفاح أحمر طازج','محلي',2500,3000,'1 كغ','https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80&auto=format&fit=crop','خصم','c3',false,true),
('p2','حليب طازج كامل الدسم','البان الريف',1500,null,'1 لتر','https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80&auto=format&fit=crop','الأكثر مبيعاً','c9',false,true),
('p5','برغر دجاج عائلي','مطعم الذواقة',6500,null,'وجبة','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80&auto=format&fit=crop','الأكثر مبيعاً','c2',false,true),
('o1','زيت زيتون بكر ممتاز','زيتون الجبل',12500,15000,'1 لتر','https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80&auto=format&fit=crop','خصم','c1',true,false),
('o2','أرز بسمتي فاخر','السلطان',4500,5500,'5 كغ','https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80&auto=format&fit=crop','خصم','c1',true,false)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Fleet / drivers for dispatch (text ids e.g. d1 — used by local demo + assignment UI)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.delivery_drivers (
  id text primary key,
  name text not null,
  phone text not null,
  avatar_url text not null,
  vehicle text not null,
  rating numeric(3,1) not null default 4.5
    check (rating >= 0 and rating <= 5),
  status text not null default 'offline'
    check (status in ('online','busy','offline')),
  today_orders integer not null default 0 check (today_orders >= 0),
  earnings_today numeric(12,2) not null default 0 check (earnings_today >= 0),
  created_at timestamptz not null default now()
);

alter table public.delivery_drivers enable row level security;

drop policy if exists "public read delivery_drivers" on public.delivery_drivers;
create policy "public read delivery_drivers"
on public.delivery_drivers for select
using (true);

insert into public.delivery_drivers (
  id, name, phone, avatar_url, vehicle, rating, status, today_orders, earnings_today
) values
(
  'd1','أحمد الجبوري','+9647701234567',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80&auto=format&fit=crop',
  'دراجة نارية - يماها', 4.9, 'online', 12, 24000
),
(
  'd2','عمر الكاظمي','+9647712345678',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop',
  'سيارة - كيا بيكانتو', 4.7, 'busy', 8, 16000
),
(
  'd3','حسن العبيدي','+9647723456789',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80&auto=format&fit=crop',
  'دراجة نارية - هوندا', 4.8, 'online', 6, 12000
),
(
  'd4','محمد الساعدي','+9647734567890',
  'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&q=80&auto=format&fit=crop',
  'دراجة هوائية كهربائية', 4.6, 'offline', 0, 0
)
on conflict (id) do nothing;
