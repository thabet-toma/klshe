"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Minus, Plus, Share2, Star } from "lucide-react";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { trackEvent } from "@/lib/analytics/posthog";
import { transformImageUrl } from "@/lib/images/url";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";
import { useCart } from "@/lib/stores/cart-store";
import { useFavorites } from "@/lib/stores/favorites-store";
import ProductCard from "./ProductCard";

type Props = {
  product: Product;
  related: Product[];
};

export default function ProductDetails({ product, related }: Props) {
  const [qty, setQty] = useState(1);
  const favorited = useFavorites((s) => s.has(product.id));
  const toggleFav = useFavorites((s) => s.toggle);
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  const heroImage = transformImageUrl(product.image, 1200);

  const onAdd = () => {
    add(product, qty);
    trackEvent("cart_add", {
      product_id: product.id,
      product_name: product.name,
      vendor_id: product.vendorId,
      unit_price: product.price,
      quantity: qty,
    });
    if (!useCart.getState().vendorSwitchPrompt) {
      open();
    }
  };

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="-mt-2">
      <div className="mx-auto w-full max-w-screen-md px-4">
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                toggleFav(product.id, product.vendorId ?? DEFAULT_VENDOR_ID)
              }
              aria-label={favorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-soft ring-1 ring-black/5 transition-colors ${
                favorited
                  ? "bg-rose-500 text-white"
                  : "bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <Heart
                className="h-5 w-5"
                strokeWidth={2.4}
                fill={favorited ? "currentColor" : "none"}
              />
            </button>
            <button
              type="button"
              aria-label="مشاركة"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100"
            >
              <Share2 className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-3 w-full max-w-screen-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-square w-full overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5"
        >
          <Image
            src={heroImage}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 768px) 600px, 100vw"
            className="object-cover"
          />
          {discount > 0 && (
            <span className="absolute start-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-extrabold text-white shadow-pop">
              خصم {discount}%
            </span>
          )}
        </motion.div>
      </div>

      <div className="mx-auto mt-5 w-full max-w-screen-md px-4">
        {product.brand && (
          <span className="text-[12px] font-bold text-brand-600">
            {product.brand}
          </span>
        )}
        <h1 className="mt-1 text-2xl font-extrabold text-neutral-900">
          {product.name}
        </h1>

        <div className="mt-2 flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span className="font-bold">4.8</span>
            <span className="text-[11px] text-amber-600">(245)</span>
          </div>
          <span className="text-[12px] font-medium text-neutral-500">
            الوحدة: {product.unit}
          </span>
        </div>

        <p className="mt-4 leading-relaxed text-neutral-600">
          منتج طازج وعالي الجودة، يتم تحضيره بعناية ضمن أعلى المعايير. يصلك
          خلال 30 دقيقة وبأفضل سعر مضمون. اطلب الآن واستمتع بتوصيل سريع لباب
          بيتك.
        </p>

        <div className="mt-5 flex items-end gap-3">
          <span className="text-3xl font-extrabold text-neutral-900">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && (
            <span className="mb-1 text-base font-semibold text-neutral-400 line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-bold text-neutral-700">الكمية</span>
          <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="تقليل"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-90"
            >
              <Minus className="h-4 w-4" strokeWidth={2.6} />
            </button>
            <span className="min-w-8 text-center text-base font-extrabold">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="زيادة"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-pop hover:bg-brand-600 active:scale-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient text-base font-extrabold text-white shadow-pop transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          أضف إلى السلة - {formatPrice(product.price * qty)}
        </button>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <div className="mx-auto mb-3 flex w-full max-w-screen-md items-end justify-between px-4">
            <h2 className="text-base font-extrabold text-neutral-900">
              منتجات قد تعجبك
            </h2>
          </div>
          <div className="mx-auto w-full max-w-screen-md px-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
