"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Clock,
  MapPin,
  Navigation,
  Send,
  Store,
  UserCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/data";
import { createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type OrderItem = {
  id: number;
  product_name: string;
  quantity: number;
  line_total: number;
};

type Vendor = {
  id: string;
  name: string;
  slug: string;
};

type AvailableOrder = {
  id: string;
  short_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
  broadcast_at: string | null;
  vendors?: Vendor | null;
  order_items: OrderItem[];
};

export default function AvailableOrders() {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingOrder, setClaimingOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableOrders = async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase غير مهيأ");
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/driver/available-orders", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "تعذر جلب الطلبات المتاحة");
        setOrders([]);
        return;
      }

      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      setError("تعذر الاتصال بالخادم");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableOrders();
    
    // Set up real-time subscription
    if (!isSupabaseConfigured) return;
    
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel("available-orders-" + crypto.randomUUID())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          // Refresh the list when any order changes
          fetchAvailableOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const claimOrder = async (orderId: string) => {
    setClaimingOrder(orderId);
    setError(null);

    try {
      const response = await fetch("/api/driver/claim-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "فشلت عملية المطالبة");
        return;
      }

      if (data.success) {
        // Remove the claimed order from the list
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setError(null);
        // Could show a success message here
      } else {
        setError(data.error || "فشلت عملية المطالبة");
      }
    } catch (err) {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setClaimingOrder(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-soft ring-1 ring-black/5">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
        <p className="mt-3 text-sm font-extrabold">جارٍ تحميل الطلبات المتاحة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 p-4 text-center shadow-soft ring-1 ring-rose-100">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-2 text-sm font-extrabold text-rose-800">{error}</p>
        <button
          onClick={fetchAvailableOrders}
          className="mt-3 rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-700 hover:bg-rose-200"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-soft ring-1 ring-black/5">
        <Clock className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-3 text-sm font-extrabold">لا توجد طلبات متاحة حالياً</p>
        <p className="mt-1 text-[12px] text-neutral-500">
          ستظهر الطلبات الجديدة هنا فور بثها
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold">طلبات متاحة للمطالبة</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
          {orders.length}
        </span>
      </div>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-700">
                  {order.short_code}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-500">
                  <Clock className="h-3 w-3" />
                  {new Date(order.created_at).toLocaleTimeString("ar-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              
              <div className="mt-3">
                <p className="text-sm font-extrabold">{order.customer_name}</p>
                <p className="flex items-center gap-1 truncate text-[12px] text-neutral-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {order.customer_address}
                </p>
                {order.vendors && (
                  <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-neutral-500">
                    <Store className="h-3.5 w-3.5" />
                    {order.vendors.name}
                  </p>
                )}
              </div>

              <div className="mt-3 space-y-1">
                {order.order_items.slice(0, 2).map((item) => (
                  <div key={item.id} className="text-[11px] text-neutral-600">
                    {item.product_name} ×{item.quantity}
                  </div>
                ))}
                {order.order_items.length > 2 && (
                  <div className="text-[11px] text-neutral-500">
                    و {order.order_items.length - 2} منتجات أخرى
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-dashed border-neutral-200 pt-3">
                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-600">
                  <Banknote className="h-4 w-4" />
                  {order.payment_method === "cash" ? "نقدي" : "بطاقة"}
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatPrice(order.total)}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => claimOrder(order.id)}
                  disabled={claimingOrder === order.id}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {claimingOrder === order.id ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      جاري المطالبة...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      مطالبة بالطلب
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-neutral-100 p-2 text-neutral-600 hover:bg-neutral-200"
                  title="عرض التفاصيل"
                >
                  <Navigation className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}