-- migration_024: نظام البثّ/المطالبة (موثوق، idempotent، يصحّح 022/023)
-- المصدر الموثوق لنظام البثّ/المطالبة. migration_022 و 023 مهجوران (superseded).
--
-- مُراجَع مقابل قاعدة بيانات klshe الحيّة (project rvubnshdvrwwlrsieemj):
--   * orders_status_check الحيّ لا يحوي 'broadcast' → §2 يُسقطه ويعيده.
--   * platform_settings الحيّ = (id boolean, commission_pct numeric) — لا key/value.
--   * on_order_delivered() + trigger orders_on_delivered_finalize_finance موجودان
--     وصحيحان حيّاً (migration_015) → لا نلمسهما هنا إطلاقاً (إعادة تعريفهما تكسر كل تسليم).
--   * transactions الحيّ لا يحوي stripe_session_id ولا meta → §8 يضيف العمود.

-- ============================================================
-- 1) أعمدة دورة البثّ/المطالبة
-- ============================================================
alter table public.orders add column if not exists broadcast_at timestamptz;
alter table public.orders add column if not exists claimed_at  timestamptz;
alter table public.orders add column if not exists claimed_by  text references public.delivery_drivers(id);
alter table public.orders add column if not exists prep_status text not null default 'pending';

-- ============================================================
-- 2) قيد الحالة الموحّد (idempotent — إسقاط صريح ثم إعادة)
-- ============================================================
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders drop constraint if exists orders_prep_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('new','broadcast','accepted','preparing','ready','dispatched','on_way','delivered','cancelled','rejected')
);
alter table public.orders add constraint orders_prep_status_check check (
  prep_status in ('pending','preparing','ready')
);

-- ============================================================
-- 3) فهارس
-- ============================================================
create index if not exists idx_orders_broadcast on public.orders (broadcast_at)
  where status = 'broadcast' and claimed_by is null;
create index if not exists idx_orders_claimed_by on public.orders (claimed_by);
create index if not exists idx_orders_driver on public.orders (driver_id);

-- ============================================================
-- 4) is_driver_assigned مُصحّح (status بدل is_active، user_id = auth.uid())
-- ============================================================
create or replace function public.is_driver_assigned(target_driver_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.delivery_drivers
    where id::text = target_driver_id
      and user_id = auth.uid()
      and status in ('online','busy')
  );
$$;

-- ============================================================
-- 5) claim_order مُصحّح (نوع text، قفل FOR UPDATE، plpgsql سليم)
-- ============================================================
create or replace function public.claim_order(p_order_id uuid, p_driver_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text; v_claimed text;
begin
  if not exists (select 1 from public.delivery_drivers
                 where id = p_driver_id and status in ('online','busy')) then
    return jsonb_build_object('success', false, 'error', 'DRIVER_NOT_FOUND_OR_INACTIVE');
  end if;

  select status, claimed_by into v_status, v_claimed
    from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  end if;
  if v_status <> 'broadcast' then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_AVAILABLE_FOR_CLAIM', 'current_status', v_status);
  end if;
  if v_claimed is not null then
    return jsonb_build_object('success', false, 'error', 'ORDER_ALREADY_CLAIMED');
  end if;

  update public.orders
     set driver_id = p_driver_id, claimed_by = p_driver_id, claimed_at = now(),
         status = 'dispatched'
   where id = p_order_id and status = 'broadcast' and claimed_by is null;
  if not found then
    return jsonb_build_object('success', false, 'error', 'ORDER_CLAIM_FAILED');
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id, 'driver_id', p_driver_id,
                            'claimed_at', now(), 'new_status', 'dispatched');
end; $$;
grant execute on function public.claim_order(uuid, text) to authenticated;

-- ============================================================
-- 6) RLS الطلبات (سائق: المسند له أو بثّ غير مُطالَب)
-- ============================================================
drop policy if exists "orders_driver_select_assigned" on public.orders;
drop policy if exists "orders_driver_select_assigned_or_broadcast" on public.orders;
create policy "orders_driver_select_assigned_or_broadcast" on public.orders for select using (
  (driver_id is not null and public.is_driver_assigned(driver_id))
  or (status = 'broadcast' and claimed_by is null)
);

-- ============================================================
-- 7) نشر Realtime (publication موجود لكنه فارغ حيّاً)
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null;
end $$;
alter table public.orders replica identity full;

-- ============================================================
-- 8) idempotency للـ webhook: عمود stripe_session_id + قيد فريد
-- ============================================================
alter table public.transactions add column if not exists stripe_session_id text;
create unique index if not exists uq_tx_stripe_session
  on public.transactions (stripe_session_id)
  where stripe_session_id is not null;

-- ============================================================
-- ملاحظات:
-- - on_order_delivered() و trigger التسليم موجودان وصحيحان حيّاً (migration_015)
--   ويعتمدان platform_settings.commission_pct — لا تُعد تعريفهما هنا.
-- - migration_022/023 مهجوران؛ هذا الملف يُسقط ويعيد ما يلزم منهما فقط.
-- ============================================================
