"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Store, X } from "lucide-react";
import { useCart } from "@/lib/stores/cart-store";
import { formatPrice } from "@/lib/data";

export default function CartReplaceDialog() {
  const prompt = useCart((s) => s.vendorSwitchPrompt);
  const confirm = useCart((s) => s.confirmVendorSwitch);
  const cancel = useCart((s) => s.cancelVendorSwitch);
  const currentVendorName = useCart((s) => {
    const first = s.items[0];
    return first?.vendorName ?? "المتجر الحالي";
  });

  return (
    <AnimatePresence>
      {prompt && (
        <>
          <motion.button
            type="button"
            aria-label="إلغاء"
            onClick={cancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-replace-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-[61] w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Store className="h-5 w-5" aria-hidden />
              </div>
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2
              id="cart-replace-title"
              className="mt-3 text-lg font-bold text-neutral-900"
            >
              سلة من متجر آخر
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              سلةُك حالياً من <strong>{currentVendorName}</strong>. لإضافة{" "}
              <strong>{prompt.product.name}</strong>{" "}
              ({formatPrice(prompt.product.price)}) يجب إفراغ السلة والبدء من
              هذا المتجر.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancel}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                إفراغ السلة والمتابعة
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
