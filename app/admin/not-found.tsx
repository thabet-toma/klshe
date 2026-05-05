import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="py-10 text-center">
      <h2 className="text-lg font-extrabold text-neutral-900">مورد الإدارة غير موجود</h2>
      <Link href="/admin" className="mt-4 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">
        العودة للوحة الإدارة
      </Link>
    </div>
  );
}
