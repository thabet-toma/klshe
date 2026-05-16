-- migration_028: تنظيف RLS المتبقّي (ديناميكي — يكمّل migration_026)
--
-- migration_026 أسقط سياسات بأسماء مُخمَّنة لم تطابق الواقع، فبقيت سياسات
-- وجداول. هذا الترحيل ديناميكي: يُسقط كل سياسة في schema public ويُعطّل RLS
-- على كل جدول مهما كان اسمها — لا تخمين أسماء.

do $$
declare r record;
begin
  -- إسقاط كل سياسات RLS في public
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I',
                    r.policyname, r.schemaname, r.tablename);
  end loop;

  -- تعطيل RLS على كل جدول في public ما زال مفعّلاً
  for r in
    select c.relname
      from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind = 'r'
       and c.relrowsecurity = true
  loop
    execute format('alter table public.%I disable row level security', r.relname);
  end loop;
end $$;

-- ملاحظة: النموذج الأمني = طبقة التطبيق (lib/auth/guard) عبر service-role.
-- لا تُعاد أي سياسة RLS؛ أي حماية صفّية مستقبلية تتطلب قراراً معمارياً.
