"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import ProductCard from "@/app/components/storefront/ProductCard";
import type { Product } from "@/lib/data";
import { useFavorites } from "@/lib/stores/favorites-store";

export default function FavoritesPage() {
  const ids = useFavorites((s) => s.ids);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      void (async () => {
        setLoading(true);
        try {
          const qs = encodeURIComponent(ids.join(","));
          const r = await fetch(`/api/storefront/products-by-ids?ids=${qs}`, {
            cache: "no-store",
          });
          const j = (await r.json()) as { products?: Product[] };
          if (!cancelled && r.ok && Array.isArray(j.products)) {
            setProducts(j.products);
          }
        } catch {
          if (!cancelled) setProducts([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ids]);

  if (loading && ids.length > 0) {
    return (
      <div className="mx-auto flex max-w-screen-md items-center justify-center gap-2 px-4 py-20 text-sm text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        جارٍ تحميل المفضلة…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-md px-4 pb-12 pt-4">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" strokeWidth={2.2} />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-neutral-900">المفضلة</h1>
          <p className="text-sm text-neutral-500">
            المنتجات التي ضغطت على القلب بجانبها. عند تسجيل الدخول تُزامن مع
            حسابك.
          </p>
        </div>
      </div>

      {ids.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-black/5">
          <p className="text-sm text-neutral-600">
            لا توجد منتجات بعد. تصفّح المتجر واضغط القلب على أي منتج لإضافته هنا.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop"
          >
            تصفّح المنتجات
          </Link>
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-3xl bg-amber-50 p-6 text-center text-sm text-amber-900 ring-1 ring-amber-100">
          بعض المنتجات لم تعد متوفرة. امسح المفضلة أو حدّث القائمة من المتجر.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
