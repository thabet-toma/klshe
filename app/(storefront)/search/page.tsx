import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import ProductCard from "@/app/components/storefront/ProductCard";
import VendorCard from "@/app/components/storefront/VendorCard";
import { searchStorefront } from "@/lib/supabase/storefront";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    open_now?: string;
    free_delivery?: string;
    rating_min?: string;
    min_order_max?: string;
    vendor_category?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const openNow = sp.open_now === "1";
  const freeDelivery = sp.free_delivery === "1";
  const ratingMin = Number(sp.rating_min ?? "0");
  const minOrderMax = Number(sp.min_order_max ?? "0");
  const vendorCategory = typeof sp.vendor_category === "string" ? sp.vendor_category : "";

  const { vendors: rawVendors, products } = await searchStorefront(q);
  const vendors = rawVendors.filter((v) => {
    if (openNow) {
      // TODO: replace with real schedule check against opening_hours field.
    }
    if (freeDelivery && v.delivery_fee_base > 0) return false;
    if (ratingMin > 0 && (v.rating_avg ?? 0) < ratingMin) return false;
    if (minOrderMax > 0 && v.min_order_amount > minOrderMax) return false;
    if (vendorCategory && v.category_id !== vendorCategory) return false;
    return true;
  });
  const hasQuery = q.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 pb-8 pt-2">
      <nav className="mb-4 flex items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="font-bold text-brand-600 hover:text-brand-700">
          الرئيسية
        </Link>
        <ChevronRight className="h-4 w-4 rotate-180 text-neutral-400" />
        <span className="font-extrabold text-neutral-800">بحث</span>
      </nav>

      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <Search className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" strokeWidth={2.2} />
        <div>
          <h1 className="text-lg font-extrabold text-neutral-900">نتائج البحث</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {hasQuery ? (
              <>
                عن: <span className="font-bold text-neutral-900">«{q.trim()}»</span>
              </>
            ) : (
              "اكتب كلمة في شريط البحث أعلاه ثم اضغط Enter أو ابحث من الصفحة الرئيسية."
            )}
          </p>
        </div>
      </div>

      <form className="mb-4 rounded-2xl bg-white p-3 ring-1 ring-black/5">
        <input type="hidden" name="q" value={q} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-xl bg-neutral-50 px-2 py-1.5 text-xs font-bold text-neutral-700">
            <input type="checkbox" name="open_now" value="1" defaultChecked={openNow} />
            مفتوح الآن
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl bg-neutral-50 px-2 py-1.5 text-xs font-bold text-neutral-700">
            <input type="checkbox" name="free_delivery" value="1" defaultChecked={freeDelivery} />
            توصيل مجاني
          </label>
          <label className="rounded-xl bg-neutral-50 px-2 py-1.5 text-xs font-bold text-neutral-700">
            تقييم 4+
            <select name="rating_min" defaultValue={String(ratingMin || 0)} className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1 text-xs">
              <option value="0">الكل</option>
              <option value="4">4 فأعلى</option>
            </select>
          </label>
          <label className="rounded-xl bg-neutral-50 px-2 py-1.5 text-xs font-bold text-neutral-700">
            حد الطلب الأقصى
            <input name="min_order_max" type="number" min={0} defaultValue={minOrderMax || ""} className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1 text-xs" />
          </label>
          <label className="rounded-xl bg-neutral-50 px-2 py-1.5 text-xs font-bold text-neutral-700">
            فئة المتجر
            <select name="vendor_category" defaultValue={vendorCategory} className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1 text-xs">
              <option value="">الكل</option>
              <option value="vc_restaurants">مطاعم</option>
              <option value="vc_grocery">بقالة</option>
              <option value="vc_pharmacy">صيدلية</option>
              <option value="vc_sweets">حلويات</option>
              <option value="vc_beverages">مشروبات</option>
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white">
            تطبيق الفلاتر
          </button>
        </div>
      </form>

      {!hasQuery ? null : vendors.length === 0 && products.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 ring-1 ring-black/5">
          لا توجد متاجر أو منتجات مطابقة. جرّب كلمات أخرى.
        </p>
      ) : (
        <div className="space-y-10">
          {vendors.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-extrabold text-neutral-900">
                متاجر
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {vendors.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
            </section>
          )}
          {products.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-extrabold text-neutral-900">
                منتجات
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
