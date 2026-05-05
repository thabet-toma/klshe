# ربط Supabase بالمشروع

## 1) أنشئ مشروع Supabase
- افتح [Supabase Dashboard](https://supabase.com/).
- أنشئ مشروع جديد.

## 2) طبّق الجداول
- افتح **SQL Editor**.
- انسخ محتوى الملف `supabase/schema.sql` بالكامل.
- نفّذ الأمر (Run).

## 3) اضبط متغيرات البيئة
- انسخ `.env.example` إلى `.env.local`.
- عبّئ القيم:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

(اختياري) مفاتيح JWT القديمة ما زالت مدعومة: `NEXT_PUBLIC_SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY`.

> `SUPABASE_SECRET_KEY` (أو `SUPABASE_SERVICE_ROLE_KEY` القديم) يُستخدم فقط على السيرفر عبر `app/api/orders/route.ts`.

## 4) شغّل المشروع
```bash
npm run dev
```

## 5) اختبار سريع
- افتح `/` وتأكد المنتجات تظهر.
- أضف منتج للسلة ثم أكمل الطلب من `/checkout`.
- راقب جدول `orders` و `order_items` و `transactions` في Supabase.

## المربوط حالياً
- قراءة بيانات المتجر من Supabase: `lib/supabase/storefront.ts`
- إنشاء الطلبات في Supabase: `app/api/orders/route.ts`
- واجهة الدفع تستخدم API وتعمل fallback محلي إذا Supabase غير مهيأ.
