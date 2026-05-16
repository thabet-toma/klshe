"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { useDashboard } from "@/lib/stores/dashboard-store";

// اكتشاف اللوحة حسب الدور (T1.6): يظهر فقط للأدوار غير الزبون
// (سائق/بائع/أدمن) ليصلوا لوحتهم — يحلّ شكوى «مش واضح كيف أوصل للوحة».
export default function RoleDashboardCard() {
  const role = useDashboard((s) => s.role);
  const dashboards = useDashboard((s) => s.dashboards);
  const fetchDashboards = useDashboard((s) => s.fetchDashboards);

  useEffect(() => {
    void fetchDashboards();
  }, [fetchDashboards]);

  if (!role || role === "customer" || dashboards.length === 0) return null;

  const roleLabel =
    role === "driver" ? "سائق" : role === "vendor_staff" ? "بائع" : "مدير المنصة";

  return (
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <LayoutDashboard className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-neutral-900">لوحة التحكم</h2>
          <p className="text-xs text-neutral-500">مسجّل كـ {roleLabel}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {dashboards.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3 transition-colors hover:bg-neutral-100"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-neutral-900">{d.label}</p>
                <p className="truncate text-[12px] text-neutral-500">{d.description}</p>
              </div>
              <ChevronLeft className="h-5 w-5 shrink-0 text-neutral-400" strokeWidth={2.4} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
