"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "../types";
import type { Product } from "../data";
import { DEFAULT_VENDOR_ID } from "../vendors/default-vendor";

type CartState = {
  items: CartLine[];
  /** متجر السلة الحالي — طلب واحد = متجر واحد (نموذج Haat). */
  vendorId: string | null;
  /** منتج بانتظار تأكيد المستخدم لاستبدال السلة بمتجر آخر */
  vendorSwitchPrompt: { product: Product; qty: number } | null;
  isOpen: boolean;
  add: (product: Product, qty?: number) => void;
  confirmVendorSwitch: () => void;
  cancelVendorSwitch: () => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  count: () => number;
  subtotal: () => number;
};

const lineFromProduct = (product: Product, qty: number): CartLine => ({
  productId: product.id,
  name: product.name,
  price: product.price,
  unit: product.unit,
  image: product.image,
  quantity: qty,
  vendorName: product.vendorName,
});

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      vendorId: null,
      vendorSwitchPrompt: null,
      isOpen: false,

      add: (product, qty = 1) =>
        set((s) => {
          const vid = product.vendorId ?? DEFAULT_VENDOR_ID;

          if (s.items.length > 0 && s.vendorId && s.vendorId !== vid) {
            return { vendorSwitchPrompt: { product, qty } };
          }

          const existing = s.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: i.quantity + qty }
                  : i,
              ),
              vendorId: s.vendorId ?? vid,
            };
          }

          return {
            items: [...s.items, lineFromProduct(product, qty)],
            vendorId: s.items.length === 0 ? vid : s.vendorId ?? vid,
          };
        }),

      confirmVendorSwitch: () =>
        set((s) => {
          if (!s.vendorSwitchPrompt) return {};
          const { product, qty } = s.vendorSwitchPrompt;
          const vid = product.vendorId ?? DEFAULT_VENDOR_ID;
          return {
            items: [lineFromProduct(product, qty)],
            vendorId: vid,
            vendorSwitchPrompt: null,
            isOpen: true,
          };
        }),

      cancelVendorSwitch: () => set({ vendorSwitchPrompt: null }),

      remove: (productId) =>
        set((s) => {
          const items = s.items.filter((i) => i.productId !== productId);
          return {
            items,
            vendorId: items.length === 0 ? null : s.vendorId,
          };
        }),

      setQty: (productId, qty) =>
        set((s) => {
          const items =
            qty <= 0
              ? s.items.filter((i) => i.productId !== productId)
              : s.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: qty } : i,
                );
          return {
            items,
            vendorId: items.length === 0 ? null : s.vendorId,
          };
        }),

      clear: () =>
        set({ items: [], vendorId: null, vendorSwitchPrompt: null }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "jetek-cart",
      partialize: (s) => ({ items: s.items, vendorId: s.vendorId }),
    },
  ),
);
