"use client";

import posthog from "posthog-js";

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(name, props);
}

export function getFeatureFlag(key: string): boolean | string | undefined {
  if (typeof window === "undefined") return undefined;
  return posthog.getFeatureFlag(key) ?? undefined;
}
