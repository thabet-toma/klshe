import Link from "next/link";
import type { Category } from "@/lib/data";

type Props = {
  categories: Category[];
};

export default function CategoryStrip({ categories }: Props) {
  return (
    <section className="mt-6">
      <div className="mx-auto mb-3 flex w-full max-w-screen-md items-end justify-between px-4">
        <h2 className="text-base font-extrabold text-neutral-900">
          التصنيفات
        </h2>
        <Link
          href="/categories"
          className="text-sm font-bold text-brand-600 transition-colors hover:text-brand-700"
        >
          عرض الكل
        </Link>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <ul className="mx-auto flex w-max min-w-full max-w-screen-md gap-3 px-4 pb-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex w-20 flex-col items-center gap-2 focus:outline-none"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${c.color} text-3xl shadow-soft ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-card group-active:scale-95`}
                >
                  <span aria-hidden>{c.emoji}</span>
                </span>
                <span className="line-clamp-1 text-center text-[12px] font-semibold text-neutral-700">
                  {c.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
