import Link from "next/link";

export default function DriverNotFound() {
  return (
    <div className="py-10 text-center">
      <h2 className="text-lg font-extrabold text-neutral-900">الطلب أو الصفحة غير موجودة</h2>
      <Link href="/driver" className="mt-4 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">
        العودة لتطبيق السائق
      </Link>
    </div>
  );
}
