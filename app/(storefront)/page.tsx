import { Clock, Flame, Sparkles } from "lucide-react";
import HeroCarousel from "../components/storefront/HeroCarousel";
import CategoryStrip from "../components/storefront/CategoryStrip";
import NearMeVendorsSection from "../components/storefront/NearMeVendorsSection";
import ProductCard from "../components/storefront/ProductCard";
import SectionHeader from "../components/storefront/SectionHeader";
import VendorCard from "../components/storefront/VendorCard";
import { banners } from "@/lib/data";
import {
  getFeaturedVendors,
  getStorefrontData,
} from "@/lib/supabase/storefront";

export const revalidate = 120;

export default async function Home() {
  const { categories, offersToday, trending } = await getStorefrontData();
  const featuredVendors = await getFeaturedVendors(8);
  return (
    <>
      <HeroCarousel banners={banners} />

      <CategoryStrip categories={categories} />

      <NearMeVendorsSection />

      {/* متاجر على المنصة */}
      <section className="mt-8">
        <SectionHeader
          title="متاجر على المنصة"
          subtitle="اختر متجراً وتصفّح قائمة الطعام والمنتجات"
        />
        <div className="mx-auto grid w-full max-w-screen-md grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4">
          {featuredVendors.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      </section>

      {/* عروض اليوم */}
      <section className="mt-8">
        <SectionHeader
          title="عروض اليوم"
          subtitle="ينتهي العرض خلال 12 ساعة"
          cta="عرض الكل"
        />

        <div className="mx-auto w-full max-w-screen-md px-4">
          <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-rose-50 via-orange-50 to-amber-50 p-3 ring-1 ring-rose-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500 text-white shadow-pop">
              <Flame className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-neutral-900">
                تخفيضات تصل إلى 30%
              </p>
              <p className="text-[11px] font-medium text-neutral-500">
                على مجموعة مختارة من أفضل المنتجات
              </p>
            </div>
            <span className="hidden items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-rose-600 shadow-soft sm:inline-flex">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.6} />
              12:00:00
            </span>
          </div>
        </div>

        <div className="no-scrollbar mt-4 overflow-x-auto">
          <div className="snap-x-mandatory mx-auto flex w-max min-w-full max-w-screen-md gap-3 px-4 pb-2">
            {offersToday.map((p) => (
              <div key={p.id} className="w-44 shrink-0 sm:w-52">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* الأكثر مبيعاً */}
      <section className="mt-8">
        <SectionHeader
          title="الأكثر مبيعاً"
          subtitle="اختيارات الزبائن المميزة"
        />

        <div className="mx-auto w-full max-w-screen-md px-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* مميز لك */}
      <section className="mt-8">
        <div className="mx-auto w-full max-w-screen-md px-4">
          <div className="relative overflow-hidden rounded-3xl bg-hero-gradient p-5 text-white shadow-card">
            <div className="absolute -end-8 -top-8 h-32 w-32 rounded-full bg-white/15" />
            <div className="absolute -bottom-12 -start-6 h-40 w-40 rounded-full bg-white/10" />
            <div className="relative z-10 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Sparkles className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold leading-tight">
                  اشترك في عضوية جيتك بلس
                </h3>
                <p className="mt-0.5 text-[13px] font-medium text-white/90">
                  توصيل مجاني وخصومات حصرية على جميع الطلبات
                </p>
              </div>
              <button
                type="button"
                className="hidden rounded-full bg-white px-4 py-2 text-sm font-extrabold text-brand-600 shadow-pop transition-transform hover:scale-105 active:scale-95 sm:inline-flex"
              >
                انضم الآن
              </button>
            </div>
            <button
              type="button"
              className="relative z-10 mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-brand-600 shadow-pop transition-transform hover:scale-[1.02] active:scale-95 sm:hidden"
            >
              انضم الآن
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
