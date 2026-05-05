import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Store } from "lucide-react";
import ProductCard from "@/app/components/storefront/ProductCard";
import { getVendorStorePageData } from "@/lib/supabase/storefront";
import { formatPrice } from "@/lib/data";
import { transformImageUrl } from "@/lib/images/url";

export const revalidate = 120;

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getVendorStorePageData(slug);
  if (!data) notFound();

  const { vendor, sections } = data;
  const banner =
    vendor.banner_url ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&auto=format&fit=crop";
  const bannerSrc = transformImageUrl(banner, 1400);

  return (
    <div className="mx-auto w-full max-w-screen-md pb-10">
      <div className="relative h-40 w-full overflow-hidden bg-neutral-200 sm:h-48">
        <Image
          src={bannerSrc}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
        <div className="absolute bottom-0 start-0 end-0 p-4 text-white">
          <nav className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-white/90">
            <Link href="/" className="hover:underline">
              الرئيسية
            </Link>
            <ChevronRight className="h-3.5 w-3.5 rotate-180 opacity-80" />
            <span className="line-clamp-1 font-extrabold">{vendor.name}</span>
          </nav>
          <div className="flex items-end gap-3">
            {vendor.logo_url && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white ring-2 ring-white/80">
                <Image
                  src={vendor.logo_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold leading-tight sm:text-xl">
                {vendor.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-white/90">
                <span className="inline-flex items-center gap-1">
                  <Store className="h-3.5 w-3.5" strokeWidth={2.4} />
                  توصيل من {formatPrice(vendor.delivery_fee_base)}
                </span>
                <span>·</span>
                <span>تحضير ~{vendor.default_prep_minutes} دقيقة</span>
                {vendor.min_order_amount > 0 && (
                  <>
                    <span>·</span>
                    <span>أدنى طلب {formatPrice(vendor.min_order_amount)}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {vendor.description && (
          <p className="mb-4 text-sm text-neutral-600">{vendor.description}</p>
        )}

        {sections.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
            لا توجد منتجات في هذا المتجر حالياً.
          </p>
        ) : (
          <div className="space-y-8">
            {sections.map((sec) => (
              <section key={sec.id} id={`sec-${sec.id}`}>
                <h2 className="mb-3 text-base font-extrabold text-neutral-900">
                  {sec.name}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sec.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
