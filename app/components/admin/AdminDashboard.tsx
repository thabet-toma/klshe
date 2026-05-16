"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  ShoppingBag,
  Truck,
  TrendingUp,
} from "lucide-react";
import { useOrders } from "@/lib/stores/orders-store";
import { drivers } from "@/lib/mock";
import { statusLabels, statusStyles } from "@/lib/order-status";
import { formatPrice } from "@/lib/data";

export default function AdminDashboard() {
  const orders = useOrders((s) => s.orders);

  const today = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString(),
  );
  const pending = orders.filter((o) =>
    ["new", "preparing", "dispatched", "on_way"].includes(o.status),
  );
  const completed = orders.filter((o) => o.status === "delivered");
  const revenue = completed.reduce((s, o) => s + o.total, 0);
  const onlineDrivers = drivers.filter((d) => d.status === "online").length;

  const lowStock = 5; // placeholder
  const recent = [...orders].slice(0, 5);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="طلبات اليوم"
          value={today.length}
          subtitle={`${pending.length} قيد المعالجة`}
          icon={ShoppingBag}
          gradient="from-orange-500 to-pink-500"
          delta="+12%"
        />
        <KpiCard
          title="إيرادات اليوم"
          value={`${formatPrice(revenue)}`}
          subtitle="من الطلبات المكتملة"
          icon={DollarSign}
          gradient="from-emerald-500 to-teal-500"
          delta="+8%"
        />
        <KpiCard
          title="السائقون النشطون"
          value={`${onlineDrivers}/${drivers.length}`}
          subtitle="متاحون الآن"
          icon={Truck}
          gradient="from-violet-500 to-indigo-500"
        />
        <KpiCard
          title="مخزون منخفض"
          value={lowStock}
          subtitle="منتج يحتاج تجديد"
          icon={AlertTriangle}
          gradient="from-rose-500 to-orange-500"
          alert
        />
      </div>

      {/* Pending orders & drivers */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="lg:col-span-2 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold">آخر الطلبات</h2>
              <p className="text-[12px] text-neutral-500">
                لمحة على الطلبات الواردة
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-700 hover:bg-brand-100"
            >
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
            </Link>
          </div>

          <ul className="divide-y divide-neutral-100">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-xs font-extrabold text-white shadow-pop">
                  {o.shortCode.replace("#", "")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">
                    {o.customer.name}
                  </p>
                  <p className="truncate text-[12px] text-neutral-500">
                    {o.items.length} منتج · {formatPrice(o.total)}
                  </p>
                </div>
                <span
                  className={`hidden rounded-full px-2 py-1 text-[10px] font-extrabold ring-1 sm:inline-flex ${
                    statusStyles[o.status]
                  }`}
                >
                  {statusLabels[o.status]}
                </span>
                <Link
                  href={`/admin/orders?focus=${o.id}`}
                  className="rounded-xl bg-neutral-100 p-2 text-neutral-600 hover:bg-neutral-200"
                  aria-label="فتح الطلب"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Status breakdown */}
        <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <h2 className="text-base font-extrabold">توزيع الحالات</h2>
          <p className="text-[12px] text-neutral-500">
            عدد الطلبات حسب الحالة
          </p>
          <ul className="mt-4 space-y-3">
            <StatusRow
              label="جديد"
              count={orders.filter((o) => o.status === "new").length}
              total={orders.length}
              color="bg-blue-500"
            />
            <StatusRow
              label="قيد التحضير"
              count={orders.filter((o) => o.status === "preparing").length}
              total={orders.length}
              color="bg-amber-500"
            />
            <StatusRow
              label="مع السائق"
              count={
                orders.filter(
                  (o) => o.status === "dispatched" || o.status === "on_way",
                ).length
              }
              total={orders.length}
              color="bg-violet-500"
            />
            <StatusRow
              label="تم التوصيل"
              count={completed.length}
              total={orders.length}
              color="bg-emerald-500"
            />
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <MiniStat
              label="معدل الإنجاز"
              value={`${
                orders.length === 0
                  ? 0
                  : Math.round((completed.length / orders.length) * 100)
              }%`}
              icon={CheckCircle2}
            />
            <MiniStat
              label="متوسط الوقت"
              value="38 د"
              icon={Clock}
            />
          </div>
        </section>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction
          href="/admin/orders"
          icon={ShoppingBag}
          title="إدارة الطلبات"
          desc="استلم وعيّن الطلبات للسائقين"
          color="from-orange-500 to-pink-500"
        />
        <QuickAction
          href="/admin/drivers"
          icon={Truck}
          title="إدارة السائقين"
          desc="عرض الحالات والإحصائيات"
          color="from-violet-500 to-indigo-500"
        />
        <QuickAction
          href="/erp/inventory"
          icon={Package}
          title="فحص المخزون"
          desc="تنبيهات نقص المخزون"
          color="from-emerald-500 to-teal-500"
        />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  gradient,
  delta,
  alert,
}: {
  title: string;
  value: number | string;
  unit?: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
  delta?: string;
  alert?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-pop`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </span>
        {delta && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
            <TrendingUp className="h-3 w-3" strokeWidth={3} />
            {delta}
          </span>
        )}
        {alert && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
            تنبيه
          </span>
        )}
      </div>
      <p className="mt-3 text-[12px] font-bold text-neutral-500">{title}</p>
      <p className="mt-0.5 text-2xl font-extrabold text-neutral-900">
        {value}
        {unit && (
          <span className="ms-1 text-sm font-bold text-neutral-500">
            {unit}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{subtitle}</p>
    </div>
  );
}

function StatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <li>
      <div className="flex items-center justify-between text-[12px] font-bold">
        <span className="text-neutral-700">{label}</span>
        <span className="text-neutral-500">
          {count} <span className="text-neutral-400">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-600 shadow-soft">
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <p className="mt-2 text-[11px] font-bold text-neutral-500">{label}</p>
      <p className="text-base font-extrabold">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
  color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5 transition-shadow hover:shadow-card"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-pop transition-transform group-hover:-translate-y-0.5`}
      >
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="text-[12px] text-neutral-500">{desc}</p>
      </div>
      <ArrowLeft
        className="h-5 w-5 text-neutral-400 transition-transform group-hover:-translate-x-0.5"
        strokeWidth={2.4}
      />
    </Link>
  );
}
