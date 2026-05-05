import Link from "next/link";

export default function StorefrontNotFound() {
  return (
    <div className="mx-auto w-full max-w-screen-md px-4 py-10 text-center">
      <h2 className="text-lg font-extrabold text-neutral-900">الصفحة غير موجودة</h2>
      <p className="mt-2 text-sm text-neutral-600">قد يكون الرابط غير صحيح أو تم حذف الصفحة.</p>
      <Link href="/" className="mt-4 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">
        العودة للرئيسية
      </Link>
    </div>
  );
}
