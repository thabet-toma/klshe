"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_VENDOR_ID } from "../vendors/default-vendor";

type FavoritesState = {
  ids: string[];
  setIds: (ids: string[]) => void;
  toggle: (productId: string, vendorId?: string) => void;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
  count: () => number;
};

function syncToServer(
  productId: string,
  action: "add" | "remove",
  vendorId?: string,
) {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      if (action === "add") {
        const r = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            vendorId: vendorId ?? DEFAULT_VENDOR_ID,
          }),
        });
        if (r.status === 401) return;
      } else {
        const r = await fetch(
          `/api/favorites?productId=${encodeURIComponent(productId)}`,
          { method: "DELETE" },
        );
        if (r.status === 401) return;
      }
    } catch {
      /* دون اتصال — القائمة المحلية تبقى */
    }
  })();
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      setIds: (ids) => set({ ids: [...new Set(ids)] }),
      toggle: (productId, vendorId) => {
        const had = get().ids.includes(productId);
        set((s) => ({
          ids: had
            ? s.ids.filter((id) => id !== productId)
            : [...s.ids, productId],
        }));
        syncToServer(productId, had ? "remove" : "add", vendorId);
      },
      has: (productId) => get().ids.includes(productId),
      remove: (productId) => {
        set((s) => ({ ids: s.ids.filter((id) => id !== productId) }));
        syncToServer(productId, "remove");
      },
      count: () => get().ids.length,
    }),
    {
      name: "jetek-favorites",
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);
