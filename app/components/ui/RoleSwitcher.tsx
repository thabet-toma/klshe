"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  Layers,
  LayoutDashboard,
  Store,
  Truck,
  X,
} from "lucide-react";
import type { CurrentUserRoles } from "@/lib/auth/roles";

type RoleLink = {
  href: string;
  label: string;
  desc: string;
  icon: typeof Store;
  color: string;
};

export default function RoleSwitcher({ roles }: { roles: CurrentUserRoles }) {
  const [open, setOpen] = useState(false);

  if (!roles.authenticated) return null;
  const links: RoleLink[] = [];
  if (roles.isVendor) {
    links.push({
      href: "/vendor",
      label: "لوحة المتجر",
      desc: "إدارة المحل",
      icon: Store,
      color: "from-emerald-600 to-teal-600",
    });
  }
  if (roles.isAdmin) {
    links.push({
      href: "/admin",
      label: "لوحة المنصة",
      desc: "إدارة عامة",
      icon: LayoutDashboard,
      color: "from-violet-500 to-indigo-500",
    });
  }
  if (roles.isDriver || roles.isAdmin) {
    links.push({
      href: "/driver",
      label: "تطبيق السائق",
      desc: "مهام التوصيل",
      icon: Truck,
      color: "from-lime-500 to-green-600",
    });
  }
  if (links.length === 0) return null;

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
              aria-label="إغلاق القائمة"
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
                      لوحات التحكم
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      تنقل سريع بين أدوارك
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
              <ul className="grid grid-cols-2 gap-2 p-3">
                {links.map((l) => {
                  const Icon = l.icon;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="flex h-full flex-col gap-2 rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5 transition-colors hover:bg-neutral-100"
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
        aria-label="فتح لوحات التحكم"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-neutral-900/85 px-4 py-2.5 text-xs font-extrabold text-white shadow-2xl backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-95"
      >
        <Layers className="h-4 w-4" strokeWidth={2.4} />
        لوحاتي
        <ChevronUp
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.4}
        />
      </button>
    </div>
  );
}
