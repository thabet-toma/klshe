"use client";

import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Star,
  Wallet,
} from "lucide-react";
import { useOrders } from "@/lib/stores/orders-store";
import { drivers, statusLabels, statusStyles } from "@/lib/mock";
import { formatPrice } from "@/lib/data";

const me = drivers[0];
const COMMISSION = 0.1;

export default function DriverHome() {
  const orders = useOrders((s) => s.orders);

  const myOrders = orders.filter((o) => o.driverId === me.id);
  const active = myOrders.filter((o) =>
    ["dispatched", "on_way"].includes(o.status),
  );
  const todayDelivered = myOrders.filter((o) => o.status === "delivered");
  const collected = todayDelivered.reduce((s, o) => s + o.total, 0);
  const commission = Math.round(collected * COMMISSION);
  const netToStore = collected - commission;

  return (
    <div className="mx-auto w-full max-w-screen-md px-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-3 shadow-card ring-1 ring-black/5">
        <Stat
          label="مهام اليوم"
          value={myOrders.length}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
        <Stat
          label="نشطة الآن"
          value={active.length}
          icon={Clock}
          color="text-amber-600"
        />
        <Stat
          label="تقييمي"
          value={me.rating.toString()}
          icon={Star}
          color="text-orange-500"
        />
      </div>

      {/* Settlement */}
      <section className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-card">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Wallet className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <h2 className="text-base font-extrabold">تقاص اليوم</h2>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-white/85">المبالغ المحصلة</dt>
            <dd className="font-extrabold">
              {formatPrice(collected)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-white/85">عمولتي ({COMMISSION * 100}%)</dt>
            <dd className="font-extrabold">
              {formatPrice(commission)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-white/20 pt-2 text-base">
            <dt className="font-extrabold">الصافي للمحل</dt>
            <dd className="text-xl font-extrabold">
              {formatPrice(netToStore)}
            </dd>
          </div>
        </dl>

        <Link
          href="/driver/settlement"
          className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-emerald-700 shadow-pop"
        >
          تفاصيل التقاص الكامل
        </Link>
      </section>

      {/* Active tasks */}
      <section className="mt-5">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="text-base font-extrabold">المهام النشطة</h2>
            <p className="text-[12px] text-neutral-500">
              طلبات معينة لك الآن
            </p>
          </div>
          <Link
            href="/driver/orders"
            className="text-sm font-extrabold text-emerald-600 hover:text-emerald-700"
          >
            عرض الكل
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-soft ring-1 ring-black/5">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-sm font-extrabold">لا توجد مهام نشطة</p>
            <p className="mt-1 text-[12px] text-neutral-500">
              ستظهر الطلبات هنا فور تعيينها لك
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/driver/orders/${o.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5 transition-shadow hover:shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-gradient bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-extrabold text-white shadow-pop">
                      {o.shortCode.replace("#", "")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">
                        {o.customer.name}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[12px] text-neutral-500">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
                        {o.customer.address}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${
                        statusStyles[o.status]
                      }`}
                    >
                      {statusLabels[o.status]}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-dashed border-neutral-200 pt-3">
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-600">
                      <Banknote className="h-4 w-4" strokeWidth={2.2} />
                      {o.payment === "cash" ? "نقدي" : "بطاقة"}
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatPrice(o.total)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-extrabold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Navigation className="h-4 w-4" strokeWidth={2.4} />
                    افتح الخريطة
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-3 text-center">
      <Icon className={`mx-auto h-5 w-5 ${color}`} strokeWidth={2.4} />
      <p className="mt-1 text-xl font-extrabold">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}
