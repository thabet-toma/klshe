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
- M1: تنفيذ طبقة الهوية الموحّدة + guard المركزي + migration_026
- M2: انتحال أدمن→سائق، تشديد middleware، عزل بيانات الأدوار
- M3: توحيد رسائل الخطأ، وسم SQL المضلّل، ربط i18n الفعلي
- M4: allowlist سائقين، إعادة تصميم لوحات، رحلة زبون احترافية، اعتماد+تسوية+إشعارات
