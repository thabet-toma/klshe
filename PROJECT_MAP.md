# PROJECT MAP — jetek.app

[TECH_STACK]
- Next.js 16.2.4 (App Router, Turbopack) · React 19.2.4 · TypeScript
- Supabase (Postgres + Realtime) — وصول service-role فقط
- Firebase Auth (الهوية: popup + redirect) — جسر عبر /api/auth/session
- next-intl 4.12 (ar/he/en, RTL) · Leaflet/OSM (خرائط) · web-push (إشعارات)
- النشر: Vercel · العملة: أغورة (bigint), العرض عبر formatPrice

[SYSTEM_FLOW]
- مصادقة: Firebase client → idToken → POST /api/auth/session → cookies httpOnly
  (fb_uid, fb_profile_id=uuidv5(uid), fb_role) → كل المسارات تقرأ الهوية عبر lib/auth/identity
- شراء: cart → checkout → POST /api/orders (status=broadcast) → /orders/{id} تتبّع
- توصيل: broadcast → سائق يطالب (claim_order, FOR UPDATE) → dispatched → on_way → delivered
- مالية: delivered → trigger on_order_delivered → vendor_balances + sales_invoices

[ARCHITECTURE]
- تقسيم حسب الميزة: app/(storefront) | app/driver | app/vendor | app/admin
- Core: lib/auth/{identity,guard} (هوية+تأمين موحّد), lib/log (تتبّع غير حظري),
  lib/notify (إشعارات مركزية), lib/currency, lib/order-status (مصدر الحالة الوحيد)
- API: app/api/** — كل مسار محمي عبر requireIdentity

[SECURITY_MODEL]
- نموذج: Firebase identity + تأمين طبقة التطبيق. RLS غير مُعتمَد (service-role يتجاوزه)
- الإلزام: requireIdentity({roles}) في كل مسار + عزل ملكية (driverId==self, vendorId∈staff)
- middleware: توجيه فقط — يعيد التحقق من profiles.role (لا يثق بكوكي fb_role)

[ORPHANS & PENDING]
- Phase0 ✅: (1) دخول Google: المشكلة كانت توقّف مشروع Supabase (paused) → فشل /api/auth/session
            برسالة "TypeError: fetch failed" مُسرّبة كخطأ Google. أُعيد تفعيل المشروع + تقسية المسار
            (التقاط خطأ select، رد 503 ودّي عند انقطاع DB بدل تسريب الخطأ الخام).
            (2) المسارات المخصّصة: سليمة أصلاً (/product/[id], /store/[slug] عبر Link + middleware لغة).
            (3) منع تكرار منتج في فاتورة الشراء: حوار اكتشاف عند اختيار منتج موجود → دمج | بند منفصل | إلغاء.
- M1 ✅: طبقة الهوية + guard المركزي + migration_026 + سباق الشراء + صفحة تأكيد + اكتشاف اللوحات
- M2 ✅: انتحال أدمن→سائق (migration_028 + API + UI)، middleware يتحقق من DB، عزل أدوار مثبت،
         كشف الدور في login، زر Google ثابت، مسار تسجيل سائق/بائع واضح + /account/onboarding
- M3: ✅ كشف stubs مكتمل — عملاء الأدمن مربوطون ببيانات حقيقية (/api/admin/customers)،
       فلتر «مفتوح الآن» مُفعّل (vendors.is_open + migration_029 على RPC). mockProductsRows فهو
       fallback عرض مقصود (لا كود ميت). الأخطاء/العملة (formatPrice)/التاريخ متسقة أصلاً.
       متبقٍّ: i18n مطبَّق فعلياً في مكوّنَين فقط من 65 — البنية (next-intl + messages/ar|he|en) جاهزة
       لكن ~63 مكوّناً يكتب العربية مباشرةً ⇒ يحتاج ترحيل نصوص + ترجمات he/en (قرار محتوى).
- M4: ✅ منفّذ مسبقاً — اختبارات (5 ملفات/12 اختبار تمر) + CI (.github/workflows/ci.yml) +
       تسوية/مدفوعات (api/{vendor,admin}/payouts + /driver/settlement) + دورة السائق الكاملة
       (PATCH pickup/start/arrived/delivered + push) + allowlist السائقين (admin/drivers).
       متبقٍّ ذاتي: صقل تصميم اللوحات/رحلة الزبون (يحتاج توجيه تصميمي).
