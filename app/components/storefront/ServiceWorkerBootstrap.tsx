"use client";

import { useEffect } from "react";

export default function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
