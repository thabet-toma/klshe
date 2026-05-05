"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!key) return;
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      loaded(instance) {
        instance.reloadFeatureFlags();
        instance.onFeatureFlags((flags: string[]) => {
          posthog.capture("feature_flags_loaded", { active_flags: flags });
        });
      },
    });
  }, []);

  useEffect(() => {
    if (!key) return;
    const qs = searchParams.toString();
    posthog.capture("pageview", { path: qs ? `${pathname}?${qs}` : pathname });
  }, [pathname, searchParams]);

  return <Provider client={posthog}>{children}</Provider>;
}
