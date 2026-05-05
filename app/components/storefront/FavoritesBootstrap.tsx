"use client";

import { useEffect } from "react";
import {
  createBrowserSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { useFavorites } from "@/lib/stores/favorites-store";

/** عند وجود جلسة: جلب المفضلة من السيرفر ودمجها مع المخزن المحلي. */
export default function FavoritesBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = createBrowserSupabase();

    async function pullAndMerge(localIds: string[]) {
      try {
        const res = await fetch("/api/favorites", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { ids?: string[] };
        const serverIds = Array.isArray(j.ids) ? j.ids : [];

        if (localIds.length === 0) {
          useFavorites.getState().setIds(serverIds);
          return;
        }

        const mergeRes = await fetch("/api/favorites/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: localIds }),
          cache: "no-store",
        });
        if (mergeRes.ok) {
          const m = (await mergeRes.json()) as { ids?: string[] };
          if (Array.isArray(m.ids)) {
            useFavorites.getState().setIds(m.ids);
            return;
          }
        }
        useFavorites
          .getState()
          .setIds([...new Set([...serverIds, ...localIds])]);
      } catch {
        /* تجاهل */
      }
    }

    void sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const localIds = useFavorites.getState().ids;
      void pullAndMerge(localIds);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const localIds = useFavorites.getState().ids;
        void pullAndMerge(localIds);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
