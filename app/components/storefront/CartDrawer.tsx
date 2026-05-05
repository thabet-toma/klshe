"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/stores/cart-store";
import { formatPrice } from "@/lib/data";

const DELIVERY_FEE = 2000;

export default function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());

  const total = items.length > 0 ? subtotal + DELIVERY_FEE : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق السلة"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-label="سلة المشتريات"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 end-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-pop">
                  <ShoppingBag className="h-5 w-5" strokeWidth={2.4} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-neutral-900">
                    سلة المشتريات
                  </h2>
                  <p className="text-[12px] font-medium text-neutral-500">
                    {items.length} منتج
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="إغلاق"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-500">
                    <ShoppingBag className="h-10 w-10" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="text-base font-extrabold text-neutral-900">
                      سلتك فارغة
                    </p>
                    <p className="mt-1 text-sm font-medium text-neutral-500">
                      أضف منتجات من المتجر للبدء
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-pop hover:bg-brand-600"
                  >
                    تصفح المتجر
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li
                      key={it.productId}
                      className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-2.5 ring-1 ring-black/5"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                        <Image
                          src={it.image}
                          alt={it.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-bold text-neutral-900">
                          {it.name}
                        </h3>
                        <p className="text-[11px] text-neutral-500">{it.unit}</p>
                        <p className="mt-0.5 text-sm font-extrabold text-brand-600">
                          {formatPrice(it.price * it.quantity)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => remove(it.productId)}
                          aria-label="حذف"
                          className="text-neutral-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
                          <button
                            type="button"
                            onClick={() => setQty(it.productId, it.quantity - 1)}
                            aria-label="تقليل"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-90"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-extrabold">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(it.productId, it.quantity + 1)}
                            aria-label="زيادة"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white shadow-pop hover:bg-brand-600 active:scale-90"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-black/5 bg-white px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-neutral-600">
                    <dt>المجموع الفرعي</dt>
                    <dd className="font-bold">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600">
                    <dt>التوصيل</dt>
                    <dd className="font-bold">
                      {formatPrice(DELIVERY_FEE)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-2 text-base">
                    <dt className="font-extrabold text-neutral-900">
                      المجموع الكلي
                    </dt>
                    <dd className="font-extrabold text-brand-600">
                      {formatPrice(total)}
                    </dd>
                  </div>
                </dl>

                <Link
                  href="/checkout"
                  onClick={close}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient text-base font-extrabold text-white shadow-pop transition-transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  متابعة لإتمام الطلب
                </Link>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
