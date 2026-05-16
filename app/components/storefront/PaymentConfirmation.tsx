"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/data";

type OrderData = {
  id: string;
  short_code: string;
  status: string;
  total: number;
  payment_method: string;
  created_at: string;
};

export default function PaymentConfirmation({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchOrder() {
      try {
        const r = await fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (!r.ok) {
          if (r.status === 401) {
            setError("يجب تسجيل الدخول لعرض تفاصيل الطلب.");
          } else if (r.status === 404) {
            setError("الطلب غير موجود.");
          } else {
            setError("تعذر تحميل تفاصيل الطلب.");
          }
          return;
        }
        const json = (await r.json()) as { order?: OrderData };
        if (!active) return;
        if (!json.order) {
          setError("الطلب غير موجود.");
          return;
        }
        setOrder(json.order);
      } catch {
        if (active) setError("تعذر الاتصال بالخادم.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchOrder();

    // Auto-refresh every 3s while order is still in "new" status (waiting for webhook)
    const interval = setInterval(() => {
      if (active) void fetchOrder();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId]);

  // Auto-redirect to tracking when order is confirmed
  useEffect(() => {
    if (order && order.status !== "new") {
      const timer = setTimeout(() => {
        router.replace(`/orders/${orderId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [order?.status, orderId, router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-md px-4 py-12 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-500" />
        <p className="mt-4 text-base font-extrabold">جارٍ التحقق من الدفع...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto w-full max-w-screen-md px-4 py-12 text-center">
        <XCircle className="mx-auto h-16 w-16 text-rose-500" />
        <h1 className="mt-4 text-xl font-extrabold text-rose-700">خطأ في الدفع</h1>
        <p className="mt-2 text-sm text-neutral-600">{error ?? "تعذر التحقق من حالة الدفع."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/orders" className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop">
            طلباتي
          </Link>
          <Link href="/" className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-neutral-700 shadow-soft ring-1 ring-black/5">
            الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status !== "new" || order.payment_method === "cash";

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 py-8">
      <div className="text-center">
        {isPaid ? (
          <>
            <CheckCircle className="mx-auto h-20 w-20 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-extrabold text-emerald-700">تم الدفع بنجاح!</h1>
            <p className="mt-2 text-sm text-neutral-600">
              طلب {order.short_code} قيد المعالجة وسيتم إرساله قريباً.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-20 w-20 animate-spin text-brand-500" />
            <h1 className="mt-4 text-2xl font-extrabold">جارٍ تأكيد الدفع...</h1>
            <p className="mt-2 text-sm text-neutral-600">
              تم استلام الدفع. بانتظار تأكيد النظام لإرسال الطلب.
            </p>
          </>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">رقم الطلب</dt>
            <dd className="font-bold">{order.short_code}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">الحالة</dt>
            <dd className="font-bold">{order.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">المبلغ</dt>
            <dd className="font-bold text-brand-600">{formatPrice(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">طريقة الدفع</dt>
            <dd className="font-bold">{order.payment_method === "card" ? "بطاقة" : "نقداً"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link href={`/orders/${orderId}`} className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-pop">
          تتبّع الطلب
        </Link>
        <Link href="/orders" className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-neutral-700 shadow-soft ring-1 ring-black/5">
          جميع الطلبات
        </Link>
      </div>
    </div>
  );
}
