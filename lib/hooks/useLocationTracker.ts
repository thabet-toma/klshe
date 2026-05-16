"use client";

import { useEffect, useRef } from "react";

const INTERVAL_MS = 15_000;

export function useLocationTracker(enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    async function push(lat: number, lng: number) {
      try {
        await fetch("/api/driver/location", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
      } catch {
        // fire-and-forget — geolocation errors are non-fatal
      }
    }

    function send() {
      navigator.geolocation.getCurrentPosition(
        (pos) => void push(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    send();
    timerRef.current = setInterval(send, INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled]);
}
