import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-screen-md px-4 py-6">
      <h1 className="text-xl font-extrabold text-neutral-900">سياسة الخصوصية</h1>
      <p className="mt-3 text-sm text-neutral-700">
        نستخدم بياناتك لتشغيل الطلبات، تحسين تجربة الاستخدام، وتقديم الدعم. لا نقوم ببيع البيانات
        لأي طرف ثالث.
      </p>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-neutral-700">
        <li>بيانات الحساب: الاسم، الهاتف، البريد عند التسجيل.</li>
        <li>بيانات الطلب: العنوان، المنتجات، حالة التوصيل، وسجل الطلبات.</li>
        <li>بيانات الجهاز والتحليلات لتحسين الأداء والاستقرار.</li>
      </ul>
      <p className="mt-4 text-sm text-neutral-700">
        يمكنك طلب حذف الحساب أو تعديل البيانات من خلال التواصل مع الدعم.
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">
        العودة للرئيسية
      </Link>
    </div>
  );
}
