"use client";

import { Banknote, CheckCircle2, Receipt, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/data";

// TODO: replace with real driver data from API
const me = { id: "me", name: "السائق", rating: 4.8 };
const COMMISSION = 0.1;

export default function DriverSettlement() {
  // TODO: fetch real driver settlement data from API
  const mineDelivered: { id: string; shortCode: string; payment: string; total: number; customer: { name: string } }[] = [];
  const collected = 0;
  const commission = 0;
  const netToStore = 0;
  const cashOnly = 0;
  const cardOnly = 0;

  return (
    <div className="mx-auto w-full max-w-screen-md px-4">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-card">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Wallet className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <h1 className="text-base font-extrabold">تقاص اليوم</h1>
        </div>

        <p className="mt-3 text-[12px] font-bold text-white/85">
          إجمالي المبالغ المحصلة من الزبائن
        </p>
        <p className="mt-1 text-3xl font-extrabold">
          {formatPrice(collected)}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="نقداً" value={cashOnly} icon={Banknote} />
          <Row label="بطاقات" value={cardOnly} icon={Receipt} />
        </dl>
      </section>

      {/* Breakdown */}
      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        <h2 className="text-base font-extrabold">المعادلة</h2>
        <dl className="mt-3 space-y-2.5">
          <Calc
            label="المبالغ المحصلة"
            value={collected}
            sub="من إجمالي طلبات منجزة"
          />
          <Calc
            label={`عمولة السائق (${COMMISSION * 100}%)`}
            value={commission}
            sub="مستحق لي عن التوصيل"
            negative
          />
          <hr className="border-dashed border-neutral-200" />
          <Calc
            label="الصافي للمحل"
            value={netToStore}
            highlight
            sub="المبلغ الواجب تسليمه للمحل"
          />
        </dl>

        <button
          type="button"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-white shadow-pop"
        >
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
          تأكيد التسليم للمحل
        </button>
      </section>

      {/* Delivered orders summary */}
      <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        <h2 className="text-base font-extrabold">
          الطلبات المنجزة ({mineDelivered.length})
        </h2>
        {mineDelivered.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            لم يتم إنجاز أي طلبات بعد
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {mineDelivered.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xs font-extrabold text-emerald-700">
                  {o.shortCode.replace("#", "")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {o.customer.name}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {o.payment === "cash" ? "نقدي" : "بطاقة"}
                  </p>
                </div>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatPrice(o.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="inline-flex items-center gap-1.5 text-white/85">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
        {label}
      </dt>
      <dd className="font-extrabold">
        {formatPrice(value)}
      </dd>
    </div>
  );
}

function Calc({
  label,
  value,
  sub,
  negative,
  highlight,
}: {
  label: string;
  value: number;
  sub: string;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p
          className={`text-sm ${
            highlight ? "font-extrabold text-neutral-900" : "font-bold text-neutral-700"
          }`}
        >
          {label}
        </p>
        <p className="text-[11px] text-neutral-500">{sub}</p>
      </div>
      <p
        className={`text-base ${
          highlight
            ? "font-extrabold text-emerald-700"
            : negative
              ? "font-extrabold text-rose-600"
              : "font-extrabold"
        }`}
      >
        {negative ? "-" : ""}
        {formatPrice(value)}
      </p>
    </div>
  );
}
