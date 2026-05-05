"use client";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-screen-md px-4 py-10 text-center">
      <h2 className="text-lg font-extrabold text-neutral-900">حدث خطأ في صفحة المتجر</h2>
      <p className="mt-2 text-sm text-neutral-600">{error.message || "تعذر تحميل البيانات."}</p>
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
