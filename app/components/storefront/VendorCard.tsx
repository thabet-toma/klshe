import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Star, Store, Truck } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { formatDistanceMeters } from "@/lib/geo/haversine";
import { transformImageUrl } from "@/lib/images/url";
import type { VendorSummary } from "@/lib/supabase/storefront";

export default function VendorCard({ vendor }: { vendor: VendorSummary }) {
  const cover =
    vendor.banner_url ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop";
  const logo = vendor.logo_url ? transformImageUrl(vendor.logo_url, 200) : null;
  const coverSrc = transformImageUrl(cover, 800);

  return (
    <Link
      href={`/store/${vendor.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5 transition-shadow hover:shadow-card"
    >
      <div className="relative h-28 w-full overflow-hidden bg-neutral-100">
        <Image
          src={coverSrc}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 768px) 33vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {vendor.distance_m !== undefined && (
          <span className="absolute end-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 shadow-soft ring-1 ring-black/5">
            <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.4} />
            {formatDistanceMeters(vendor.distance_m)}
          </span>
        )}
        {logo && (
          <div className="absolute bottom-2 start-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-lg ring-1 ring-black/5">
            <Image
              src={logo}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-extrabold text-neutral-900 group-hover:text-brand-600">
          {vendor.name}
        </p>
        {vendor.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500">
            {vendor.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-neutral-600">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-2 py-0.5">
            <Truck className="h-3 w-3" strokeWidth={2.4} />
            توصيل {formatPrice(vendor.delivery_fee_base)}
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-2 py-0.5">
            <Clock className="h-3 w-3" strokeWidth={2.4} />
            ~{vendor.default_prep_minutes} د
          </span>
          {typeof vendor.rating_avg === "number" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
              <Star className="h-3 w-3" strokeWidth={2.4} />
              {vendor.rating_avg.toFixed(1)}
            </span>
          )}
          {vendor.min_order_amount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
              <Store className="h-3 w-3" strokeWidth={2.4} />
              أدنى {formatPrice(vendor.min_order_amount)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
