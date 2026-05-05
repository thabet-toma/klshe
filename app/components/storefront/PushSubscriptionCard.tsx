"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushSubscriptionCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMsg("المتصفح لا يدعم Web Push.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const g = await fetch("/api/push/subscribe", { cache: "no-store" });
      const gj = (await g.json()) as { vapidPublicKey?: string };
      if (!gj.vapidPublicKey) {
        setMsg("مفاتيح الإشعارات غير مهيأة.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg("تم رفض إذن الإشعارات.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(gj.vapidPublicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setMsg("تم تفعيل إشعارات الطلبات.");
    } catch {
      setMsg("تعذر تفعيل الإشعارات.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h2 className="text-sm font-extrabold text-neutral-900">إشعارات الطلبات</h2>
      <p className="mt-1 text-xs text-neutral-600">استلم إشعاراً عند تغيير حالة الطلب.</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void subscribe()}
        className="mt-3 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
      >
        {busy ? "جارٍ التفعيل..." : "تفعيل الإشعارات"}
      </button>
      {msg && <p className="mt-2 text-xs font-bold text-brand-700">{msg}</p>}
    </div>
  );
}
