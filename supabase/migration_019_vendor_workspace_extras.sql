-- migration_019_vendor_workspace_extras.sql
-- Adds vendor-side bookkeeping tables (manual sales/purchase invoices,
-- suppliers, inventory, walk-in customer ledger) so the vendor dashboard
-- can replace the legacy /erp pages.

-- =============================================================
-- Per-vendor commission + manual open/close + per-km delivery + address text
-- + global platform settings
-- =============================================================
alter table public.vendors
  add column if not exists commission_rate numeric(5,2) not null default 10.00;
alter table public.vendors
  add column if not exists is_open boolean not null default true;
alter table public.vendors
  add column if not exists delivery_fee_per_km bigint not null default 0;
alter table public.vendors
  add column if not exists address_text text;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin_all on public.platform_settings;
create policy platform_settings_admin_all on public.platform_settings
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read on public.platform_settings
  for select using (true);


-- =============================================================
-- vendor_inventory: per-vendor stock for products
-- =============================================================
create table if not exists public.vendor_inventory (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  cost_price bigint not null default 0,
  unit text,
  updated_at timestamptz not null default now(),
  unique (vendor_id, product_id)
);

create index if not exists idx_vendor_inventory_vendor on public.vendor_inventory(vendor_id);
alter table public.vendor_inventory enable row level security;

drop policy if exists vendor_inventory_select on public.vendor_inventory;
create policy vendor_inventory_select on public.vendor_inventory
  for select using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_inventory.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

drop policy if exists vendor_inventory_modify on public.vendor_inventory;
create policy vendor_inventory_modify on public.vendor_inventory
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_inventory.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_inventory.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- =============================================================
-- vendor_suppliers
-- =============================================================
create table if not exists public.vendor_suppliers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_suppliers_vendor on public.vendor_suppliers(vendor_id);
alter table public.vendor_suppliers enable row level security;

drop policy if exists vendor_suppliers_all on public.vendor_suppliers;
create policy vendor_suppliers_all on public.vendor_suppliers
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_suppliers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_suppliers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- =============================================================
-- vendor_customers (walk-in / external customers ledger)
-- =============================================================
create table if not exists public.vendor_customers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  phone text,
  note text,
  balance bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_customers_vendor on public.vendor_customers(vendor_id);
alter table public.vendor_customers enable row level security;

drop policy if exists vendor_customers_all on public.vendor_customers;
create policy vendor_customers_all on public.vendor_customers
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_customers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_customers.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

create table if not exists public.vendor_customer_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.vendor_customers(id) on delete cascade,
  type text not null check (type in ('debt','payment')),
  amount bigint not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_customer_tx_customer on public.vendor_customer_transactions(customer_id);
alter table public.vendor_customer_transactions enable row level security;

drop policy if exists vendor_customer_tx_all on public.vendor_customer_transactions;
create policy vendor_customer_tx_all on public.vendor_customer_transactions
  for all using (
    exists (
      select 1
      from public.vendor_customers c
      join public.vendor_staff vs on vs.vendor_id = c.vendor_id
      where c.id = vendor_customer_transactions.customer_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1
      from public.vendor_customers c
      join public.vendor_staff vs on vs.vendor_id = c.vendor_id
      where c.id = vendor_customer_transactions.customer_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- Trigger keeps balance in sync.
create or replace function public.vendor_customer_tx_apply()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.vendor_customers
       set balance = balance + (case when NEW.type = 'debt' then NEW.amount else -NEW.amount end)
     where id = NEW.customer_id;
    return NEW;
  end if;
  if (TG_OP = 'DELETE') then
    update public.vendor_customers
       set balance = balance - (case when OLD.type = 'debt' then OLD.amount else -OLD.amount end)
     where id = OLD.customer_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_vendor_customer_tx_apply on public.vendor_customer_transactions;
create trigger trg_vendor_customer_tx_apply
  after insert or delete on public.vendor_customer_transactions
  for each row execute function public.vendor_customer_tx_apply();

-- =============================================================
-- vendor_sales_invoices (manual / walk-in)
-- =============================================================
create table if not exists public.vendor_sales_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  customer_id uuid references public.vendor_customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','credit')),
  subtotal bigint not null default 0,
  discount bigint not null default 0,
  total bigint not null default 0,
  note text,
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_vendor_sales_invoices_vendor on public.vendor_sales_invoices(vendor_id);
alter table public.vendor_sales_invoices enable row level security;

drop policy if exists vendor_sales_invoices_all on public.vendor_sales_invoices;
create policy vendor_sales_invoices_all on public.vendor_sales_invoices
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_sales_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_sales_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

create table if not exists public.vendor_sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.vendor_sales_invoices(id) on delete cascade,
  product_id text references public.products(id),
  name_snapshot text not null,
  qty numeric not null,
  unit_price bigint not null,
  total bigint not null
);
create index if not exists idx_vendor_sales_invoice_items_invoice on public.vendor_sales_invoice_items(invoice_id);
alter table public.vendor_sales_invoice_items enable row level security;

drop policy if exists vendor_sales_invoice_items_all on public.vendor_sales_invoice_items;
create policy vendor_sales_invoice_items_all on public.vendor_sales_invoice_items
  for all using (
    exists (
      select 1
      from public.vendor_sales_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_sales_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1
      from public.vendor_sales_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_sales_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- =============================================================
-- vendor_purchase_invoices
-- =============================================================
create table if not exists public.vendor_purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  supplier_id uuid references public.vendor_suppliers(id) on delete set null,
  total bigint not null default 0,
  paid bigint not null default 0,
  status text not null default 'unpaid' check (status in ('paid','partial','unpaid')),
  note text,
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_vendor_purchase_invoices_vendor on public.vendor_purchase_invoices(vendor_id);
alter table public.vendor_purchase_invoices enable row level security;

drop policy if exists vendor_purchase_invoices_all on public.vendor_purchase_invoices;
create policy vendor_purchase_invoices_all on public.vendor_purchase_invoices
  for all using (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_purchase_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1 from public.vendor_staff vs
      where vs.vendor_id = vendor_purchase_invoices.vendor_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

create table if not exists public.vendor_purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.vendor_purchase_invoices(id) on delete cascade,
  product_id text references public.products(id),
  name_snapshot text not null,
  qty numeric not null,
  unit_cost bigint not null,
  total bigint not null
);
create index if not exists idx_vendor_purchase_invoice_items_invoice on public.vendor_purchase_invoice_items(invoice_id);
alter table public.vendor_purchase_invoice_items enable row level security;

drop policy if exists vendor_purchase_invoice_items_all on public.vendor_purchase_invoice_items;
create policy vendor_purchase_invoice_items_all on public.vendor_purchase_invoice_items
  for all using (
    exists (
      select 1
      from public.vendor_purchase_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_purchase_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    exists (
      select 1
      from public.vendor_purchase_invoices inv
      join public.vendor_staff vs on vs.vendor_id = inv.vendor_id
      where inv.id = vendor_purchase_invoice_items.invoice_id
        and vs.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- When a purchase invoice item is inserted, increment vendor_inventory.stock automatically.
create or replace function public.vendor_purchase_item_apply()
returns trigger
language plpgsql
as $$
declare
  v_vendor uuid;
begin
  if (NEW.product_id is null) then
    return NEW;
  end if;
  select vendor_id into v_vendor
  from public.vendor_purchase_invoices
  where id = NEW.invoice_id;

  if v_vendor is null then
    return NEW;
  end if;

  insert into public.vendor_inventory (vendor_id, product_id, stock, cost_price)
  values (v_vendor, NEW.product_id, NEW.qty, NEW.unit_cost)
  on conflict (vendor_id, product_id) do update
    set stock = vendor_inventory.stock + EXCLUDED.stock,
        cost_price = EXCLUDED.cost_price,
        updated_at = now();

  return NEW;
end;
$$;

drop trigger if exists trg_vendor_purchase_item_apply on public.vendor_purchase_invoice_items;
create trigger trg_vendor_purchase_item_apply
  after insert on public.vendor_purchase_invoice_items
  for each row execute function public.vendor_purchase_item_apply();

-- When a sales invoice item is inserted, decrement vendor_inventory.stock when product is tracked.
create or replace function public.vendor_sales_item_apply()
returns trigger
language plpgsql
as $$
declare
  v_vendor uuid;
begin
  if (NEW.product_id is null) then
    return NEW;
  end if;
  select vendor_id into v_vendor
  from public.vendor_sales_invoices
  where id = NEW.invoice_id;
  if v_vendor is null then
    return NEW;
  end if;

  update public.vendor_inventory
     set stock = stock - NEW.qty,
         updated_at = now()
   where vendor_id = v_vendor and product_id = NEW.product_id;

  return NEW;
end;
$$;

drop trigger if exists trg_vendor_sales_item_apply on public.vendor_sales_invoice_items;
create trigger trg_vendor_sales_item_apply
  after insert on public.vendor_sales_invoice_items
  for each row execute function public.vendor_sales_item_apply();
