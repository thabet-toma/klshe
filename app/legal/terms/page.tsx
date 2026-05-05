import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-screen-md px-4 py-6">
      <h1 className="text-xl font-extrabold text-neutral-900">شروط الاستخدام</h1>
      <p className="mt-3 text-sm text-neutral-700">
        باستخدام المنصة، أنت توافق على الالتزام بشروط الاستخدام وسياسات الدفع والإلغاء المعتمدة.
      </p>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-neutral-700">
        <li>يجب إدخال بيانات صحيحة للعناوين ووسائل التواصل.</li>
        <li>قد تختلف أوقات التوصيل حسب المتجر والازدحام.</li>
        <li>يحق للمنصة إيقاف الحسابات المسيئة أو المخالفة.</li>
      </ul>
      <p className="mt-4 text-sm text-neutral-700">
        الاستمرار في استخدام الخدمة يعني قبول أي تحديث لاحق على هذه الشروط.
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">
        العودة للرئيسية
      </Link>
    </div>
  );
}
