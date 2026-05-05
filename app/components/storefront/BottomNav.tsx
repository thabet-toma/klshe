"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Receipt, ShoppingBag, User } from "lucide-react";
import { useI18n } from "@/app/components/i18n/I18nProvider";
import { useCart } from "@/lib/stores/cart-store";

type Item = {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isCart?: boolean;
};

export default function BottomNav() {
  const { messages } = useI18n();
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const items: Item[] = [
    { id: "home", label: messages.bottomNav.home, href: "/", icon: Home },
    { id: "orders", label: messages.bottomNav.orders, href: "/orders", icon: Receipt },
    { id: "cart", label: messages.bottomNav.cart, icon: ShoppingBag, isCart: true },
    { id: "fav", label: messages.bottomNav.favorites, href: "/favorites", icon: Heart },
    { id: "me", label: messages.bottomNav.account, href: "/account", icon: User },
  ];

  return (
    <nav className="sticky bottom-0 z-30 border-t border-black/5 bg-white/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md">
      <ul className="mx-auto flex w-full max-w-screen-md items-center justify-between px-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive =
            it.href === "/"
              ? pathname === "/"
              : it.href
                ? pathname.startsWith(it.href)
                : false;

          const inner = (
            <>
              <span
                className={`relative flex items-center justify-center rounded-2xl transition-all ${
                  it.isCart
                    ? "bg-brand-gradient text-white shadow-pop -translate-y-2 h-11 w-11"
                    : `h-9 w-9 ${isActive ? "bg-brand-50" : ""}`
                }`}
              >
                <Icon
                  className={`${it.isCart ? "h-5 w-5" : "h-[22px] w-[22px]"}`}
                  strokeWidth={2.2}
                />
                {it.isCart && count > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                    {count}
                  </span>
                )}
              </span>
              <span
                className={`text-[11px] font-bold ${it.isCart ? "-mt-1" : ""}`}
              >
                {it.label}
              </span>
            </>
          );

          const className = `relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors ${
            isActive ? "text-brand-600" : "text-neutral-500"
          }`;

          return (
            <li key={it.id} className="flex-1">
              {it.isCart ? (
                <button type="button" onClick={openCart} className={className}>
                  {inner}
                </button>
              ) : (
                <Link href={it.href ?? "/"} className={className}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
