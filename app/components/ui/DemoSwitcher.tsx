"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  Layers,
  LayoutDashboard,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
  X,
} from "lucide-react";

const links = [
  {
    href: "/",
    label: "متجر الزبون",
    desc: "Storefront",
    icon: ShoppingBag,
    color: "from-orange-500 to-pink-500",
  },
  {
    href: "/vendor",
    label: "لوحة البائع",
    desc: "Vendor Portal",
    icon: Store,
    color: "from-emerald-600 to-teal-600",
  },
  {
    href: "/admin",
    label: "لوحة الإدارة",
    desc: "Logistics Dashboard",
    icon: LayoutDashboard,
    color: "from-violet-500 to-indigo-500",
  },
  {
    href: "/driver",
    label: "تطبيق السائق",
    desc: "Driver App",
    icon: Truck,
    color: "from-lime-500 to-green-600",
  },
  {
    href: "/erp",
    label: "المحاسبة والمخزون",
    desc: "ERP Lite",
    icon: Wallet,
    color: "from-sky-500 to-blue-600",
  },
];

export default function DemoSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="pointer-events-none fixed end-3 z-[60] flex justify-end"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="pointer-events-auto fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className="pointer-events-auto absolute bottom-12 end-0 z-[60] w-[min(92vw,360px)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10"
            >
              <div className="flex items-center justify-between border-b border-black/5 bg-neutral-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-pop">
                    <Layers className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-neutral-900">
                      تبديل الواجهة
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      استكشف واجهات التطبيق المتاحة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-neutral-500 ring-1 ring-black/5 hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {links.map((l) => {
                  const Icon = l.icon;
                  const active =
                    l.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`flex h-full flex-col gap-2 rounded-2xl p-3 transition-all ${
                          active
                            ? "bg-brand-50 ring-2 ring-brand-300"
                            : "bg-neutral-50 ring-1 ring-black/5 hover:bg-neutral-100"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${l.color} text-white shadow-pop`}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span>
                          <span className="block text-sm font-extrabold text-neutral-900">
                            {l.label}
                          </span>
                          <span className="block text-[11px] text-neutral-500">
                            {l.desc}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-neutral-900/85 px-4 py-2.5 text-xs font-extrabold text-white shadow-2xl backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-95"
      >
        <Layers className="h-4 w-4" strokeWidth={2.4} />
        تبديل الواجهة
        <ChevronUp
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.4}
        />
      </button>
    </div>
  );
}
