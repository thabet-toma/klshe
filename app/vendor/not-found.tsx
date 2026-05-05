import Link from "next/link";

export default function VendorNotFound() {
  return (
    <div className="py-10 text-center">
      <h2 className="text-lg font-extrabold text-neutral-900">العنصر غير موجود</h2>
      <Link href="/vendor" className="mt-4 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white">
        العودة للوحة التاجر
      </Link>
    </div>
  );
}
