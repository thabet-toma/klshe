"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, LogOut, Wallet } from "lucide-react";
import { drivers } from "@/lib/mock";

const items = [
  { href: "/driver", label: "الرئيسية", icon: Home },
  { href: "/driver/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/driver/settlement", label: "التقاص", icon: Wallet },
];

const me = drivers[0];

export default function DriverShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <header className="bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 px-4 pb-7 pt-[max(env(safe-area-inset-top),1rem)] text-white shadow-soft">
        <div className="mx-auto flex w-full max-w-screen-md items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/40">
            <Image
              src={me.avatar}
              alt={me.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/85">مرحباً سائقنا</p>
            <p className="text-base font-extrabold leading-tight">{me.name}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold backdrop-blur-md">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-200" />
            متصل
          </span>
          <button
            type="button"
            aria-label="تسجيل الخروج"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md hover:bg-white/25"
          >
            <LogOut className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <main className="-mt-4 flex-1 pb-28">{children}</main>

      <nav className="sticky bottom-0 z-30 border-t border-black/5 bg-white/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md">
        <ul className="mx-auto flex w-full max-w-screen-md items-center justify-around px-3">
          {items.map((it) => {
            const Icon = it.icon;
            const active =
              it.href === "/driver"
                ? pathname === "/driver"
                : pathname.startsWith(it.href);
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors ${
                    active ? "text-emerald-600" : "text-neutral-500"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                      active ? "bg-emerald-50" : ""
                    }`}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
                  </span>
                  <span className="text-[11px] font-bold">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
