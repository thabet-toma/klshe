-- migration_029: انتحال أدمن→سائق للاختبار (T2.1)
--
-- النموذج الأمني: Firebase identity + حراسة طبقة التطبيق (lib/auth/guard).
-- لا تغيير دور دائم: الأدمن يحصل على صفّ delivery_drivers مؤقّت مُعلَّم is_temp
-- يُحذف عند «إنهاء التجربة». العلامة تعزل الصفّ عن قوائم/تحليلات السائقين الحقيقيين.

alter table public.delivery_drivers
  add column if not exists is_temp boolean not null default false;

comment on column public.delivery_drivers.is_temp is
  'صفّ سائق تجريبي أنشأه أدمن عبر /api/admin/impersonate-driver — يُحذف عند إنهاء التجربة. استبعِده من تحليلات السائقين.';
