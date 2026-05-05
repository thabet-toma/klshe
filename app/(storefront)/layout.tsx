import StoreHeader from "../components/storefront/StoreHeader";
import SearchBar from "../components/storefront/SearchBar";
import BottomNav from "../components/storefront/BottomNav";
import CartDrawer from "../components/storefront/CartDrawer";
import CartReplaceDialog from "../components/storefront/CartReplaceDialog";
import FavoritesBootstrap from "../components/storefront/FavoritesBootstrap";
import StickyCartBar from "../components/storefront/StickyCartBar";
import RoleSwitcher from "../components/ui/RoleSwitcher";
import Link from "next/link";
import { cookies } from "next/headers";
import ServiceWorkerBootstrap from "../components/storefront/ServiceWorkerBootstrap";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n/config";
import { messagesByLocale } from "@/lib/i18n/messages";
import { getCurrentUserRoles } from "@/lib/auth/roles";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const localeCookie = (await cookies()).get("NEXT_LOCALE")?.value ?? DEFAULT_LOCALE;
  const locale = isSupportedLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const messages = messagesByLocale[locale];
  const roles = await getCurrentUserRoles();
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <StoreHeader />
      <SearchBar />
      <main className="flex-1 pb-20">{children}</main>
      <footer className="border-t border-black/5 bg-white/95 px-4 py-3 text-xs text-neutral-600">
        <div className="mx-auto flex w-full max-w-screen-md items-center justify-between">
          <span className="font-semibold">{messages.common.copyright}</span>
          <div className="flex items-center gap-3">
            <Link href="/legal/privacy" className="font-bold text-brand-600 hover:text-brand-700">
              {messages.common.privacy}
            </Link>
            <Link href="/legal/terms" className="font-bold text-brand-600 hover:text-brand-700">
              {messages.common.terms}
            </Link>
          </div>
        </div>
      </footer>
      <StickyCartBar />
      <BottomNav />
      <CartDrawer />
      <CartReplaceDialog />
      <FavoritesBootstrap />
      <ServiceWorkerBootstrap />
      <RoleSwitcher roles={roles} />
    </div>
  );
}
