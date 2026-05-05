"use client";

export default function VendorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-10 text-center">
      <h2 className="text-lg font-extrabold text-neutral-900">خطأ في لوحة التاجر</h2>
      <p className="mt-2 text-sm text-neutral-600">{error.message || "تعذر تحميل الصفحة."}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
