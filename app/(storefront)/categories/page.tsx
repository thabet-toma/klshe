import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getStorefrontData } from "@/lib/supabase/storefront";

export default async function CategoriesIndexPage() {
  const { categories } = await getStorefrontData();

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
        <span className="font-extrabold text-neutral-800">كل التصنيفات</span>
      </nav>

      <h1 className="mb-4 text-xl font-extrabold text-neutral-900">التصنيفات</h1>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-soft ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98]"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${c.color} text-3xl shadow-soft ring-1 ring-black/5`}
                aria-hidden
              >
                {c.emoji}
              </span>
              <span className="line-clamp-2 text-sm font-extrabold text-neutral-800">
                {c.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
