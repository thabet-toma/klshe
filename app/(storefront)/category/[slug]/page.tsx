import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { notFound } from "next/navigation";
import VendorCard from "@/app/components/storefront/VendorCard";
import {
  getVendorsForCategory,
  resolveVendorCategory,
} from "@/lib/supabase/storefront";

export const revalidate = 120;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await resolveVendorCategory(slug);
  if (!category) notFound();

  const vendors = await getVendorsForCategory(slug);

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 pt-2">
      <nav className="mb-4 flex items-center gap-1 text-sm text-neutral-500">
        <Link
          href="/"
          className="font-bold text-brand-600 hover:text-brand-700"
        >
          الرئيسية
        </Link>
        <ChevronRight className="h-4 w-4 rotate-180 text-neutral-400" aria-hidden />
        <Link
          href="/categories"
          className="font-semibold text-neutral-600 hover:text-brand-600"
        >
          التصنيفات
        </Link>
        <ChevronRight className="h-4 w-4 rotate-180 text-neutral-400" aria-hidden />
        <span className="line-clamp-1 font-extrabold text-neutral-800">
          {category.name}
        </span>
      </nav>

      <div className="mb-5 flex items-center gap-3">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${category.color} text-3xl shadow-soft ring-1 ring-black/5`}
          aria-hidden
        >
          {category.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-neutral-900">{category.name}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-neutral-500">
            <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            {vendors.length} متجر في هذا القسم
          </p>
        </div>
      </div>

      {vendors.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm font-medium text-neutral-500 shadow-soft ring-1 ring-black/5">
          لا يوجد متاجر مسجّلة في هذا التصنيف بعد. جرّب تصنيفاً آخر أو تصفّح
          الرئيسية.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vendors.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
    </div>
  );
}
