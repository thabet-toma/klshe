"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/stores/cart-store";
import { formatPrice } from "@/lib/data";

export default function StickyCartBar() {
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());
  const open = useCart((s) => s.open);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 px-3 sm:bottom-20"
        >
          <button
            type="button"
            onClick={open}
            className="mx-auto flex w-full max-w-screen-md items-center justify-between gap-3 rounded-2xl bg-brand-gradient px-4 py-3 text-white shadow-pop transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                <ShoppingBag className="h-5 w-5" strokeWidth={2.4} />
                <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-brand-600 ring-2 ring-orange-500">
                  {count}
                </span>
              </span>
              <span className="text-start">
                <span className="block text-[11px] font-bold text-white/90">
                  {count} منتج في السلة
                </span>
                <span className="block text-base font-extrabold leading-tight">
                  {formatPrice(subtotal)}
                </span>
              </span>
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-extrabold backdrop-blur-md">
              عرض السلة
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
