"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, Heart, Plus, Store } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice, type Product } from "@/lib/data";
import { trackEvent } from "@/lib/analytics/posthog";
import { transformImageUrl } from "@/lib/images/url";
import { useCart } from "@/lib/stores/cart-store";
import { useFavorites } from "@/lib/stores/favorites-store";

type Props = {
  product: Product;
};

const badgeStyles: Record<NonNullable<Product["badge"]>, string> = {
  "خصم": "bg-rose-500 text-white",
  "جديد": "bg-emerald-500 text-white",
  "الأكثر مبيعاً": "bg-amber-500 text-white",
};

export default function ProductCard({ product }: Props) {
  const [pulse, setPulse] = useState(false);
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  const favorited = useFavorites((s) => s.has(product.id));
  const toggleFav = useFavorites((s) => s.toggle);
  const imageSrc = transformImageUrl(product.image, 700);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(product.id);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, 1);
    trackEvent("cart_add", {
      product_id: product.id,
      product_name: product.name,
      vendor_id: product.vendorId,
      unit_price: product.price,
      quantity: 1,
    });
    setPulse(true);
    setTimeout(() => setPulse(false), 900);
    if (!useCart.getState().vendorSwitchPrompt) {
      setTimeout(() => open(), 250);
    }
  };

  return (
    <motion.article
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5 transition-shadow hover:shadow-card"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        <Link
          href={`/product/${product.id}`}
          className="relative block h-full w-full"
        >
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {product.badge && (
            <span
              className={`absolute start-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-soft ${
                badgeStyles[product.badge]
              }`}
            >
              {product.badge}
            </span>
          )}

          {product.oldPrice && (
            <span className="absolute bottom-2 end-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 shadow-soft">
              -
              {Math.round(
                ((product.oldPrice - product.price) / product.oldPrice) * 100,
              )}
              %
            </span>
          )}
        </Link>
        <button
          type="button"
          aria-label={favorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          onClick={handleFavorite}
          className="absolute end-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-soft ring-1 ring-black/5 transition-colors hover:bg-white"
        >
          <Heart
            className={`h-[18px] w-[18px] ${
              favorited ? "fill-rose-500 text-rose-500" : "text-neutral-500"
            }`}
            strokeWidth={2.4}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        {product.brand && (
          <span className="mb-0.5 text-[11px] font-semibold text-neutral-500">
            {product.brand}
          </span>
        )}
        <Link
          href={`/product/${product.id}`}
          className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900 hover:text-brand-600"
        >
          {product.name}
        </Link>
        {product.vendorSlug && product.vendorName && (
          <Link
            href={`/store/${product.vendorSlug}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] font-extrabold text-brand-600 hover:text-brand-700"
          >
            <Store className="h-3 w-3 shrink-0" strokeWidth={2.4} />
            <span className="truncate">{product.vendorName}</span>
            <span className="shrink-0 text-[10px] font-bold text-brand-700">
              افتح المتجر
            </span>
          </Link>
        )}
        <span className="mt-1 text-[11px] text-neutral-600">{product.unit}</span>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-neutral-900">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-[11px] font-semibold text-neutral-500 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label={`إضافة ${product.name} إلى السلة`}
            onClick={handleAdd}
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
              pulse
                ? "bg-emerald-500 text-white shadow-pop animate-pop"
                : "bg-brand-500 text-white shadow-pop hover:bg-brand-600 active:scale-90"
            }`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all ${
                pulse ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all ${
                pulse ? "scale-50 opacity-0" : "scale-100 opacity-100"
              }`}
            >
              <Plus className="h-5 w-5" strokeWidth={3} />
            </span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}
