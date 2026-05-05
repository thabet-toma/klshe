-- المرحلة 2: RLS لجدول vendor_staff + استعلامات من جلسة المستخدم (لوحة /vendor)
-- نفّذ بعد migration_002_multi_vendor_auth.sql
--
-- لربط مستخدم بمتجر (مثال):
--   insert into public.vendor_staff (vendor_id, profile_id, staff_role)
--   values (
--     '00000000-0000-0000-0000-000000000001',
--     '<uuid-من-auth.users>',
--     'owner'
--   );
--   update public.profiles set role = 'vendor_staff' where id = '<نفس-uuid>';  -- اختياري للتناسق

-- قراءة صفوف موظف المتجر لصاحب الحساب
drop policy if exists "vendor_staff_select_own" on public.vendor_staff;
create policy "vendor_staff_select_own"
on public.vendor_staff for select
using (profile_id = auth.uid());

-- مدراء المنصة يرون كل الروابط (للدعم)
drop policy if exists "vendor_staff_select_admin" on public.vendor_staff;
create policy "vendor_staff_select_admin"
on public.vendor_staff for select
using (public.is_platform_admin());

comment on table public.vendor_staff is
  'ربط profile بمتجر؛ RLS يسمح بقراءة صفوف المستخدم + مدراء المنصة.';
