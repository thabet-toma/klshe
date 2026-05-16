"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Navigation,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/lib/stores/cart-store";
import { useOrders } from "@/lib/stores/orders-store";
import { formatPrice } from "@/lib/data";
import type { Order, PaymentMethod } from "@/lib/types";
import { trackEvent } from "@/lib/analytics/posthog";

const DELIVERY_FEE = 2000;

const steps = [
  { id: 1, title: "السلة", icon: ShoppingBag },
  { id: 2, title: "العنوان", icon: MapPin },
  { id: 3, title: "التوصيل", icon: Clock },
  { id: 4, title: "تأكيد", icon: Receipt },
];

type DeliveryTime = "asap" | "30min" | "1hour" | "scheduled";

type AddressRow = {
  id: string;
  label: string | null;
  line1: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
};

export default function CheckoutStepper() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const vendorId = useCart((s) => s.vendorId);
  const clearCart = useCart((s) => s.clear);
  const addOrder = useOrders((s) => s.add);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [time, setTime] = useState<DeliveryTime>("asap");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(DELIVERY_FEE);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await fetch("/api/account/addresses", { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as { addresses?: AddressRow[] };
        if (!active || !Array.isArray(json.addresses)) return;
        setSavedAddresses(json.addresses);
        const defaultAddress = json.addresses.find((a) => a.is_default);
        if (!defaultAddress) return;
        setSelectedAddressId(defaultAddress.id);
        setAddress([defaultAddress.line1, defaultAddress.city].filter(Boolean).join(" - "));
        if (defaultAddress.lat != null && defaultAddress.lng != null) {
          setLocationLat(defaultAddress.lat);
          setLocationLng(defaultAddress.lng);
        }
      } catch {
        // optional source
      } finally {
        if (active) setAddressesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (locationLat == null || locationLng == null) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setEstimating(true);
    });
    void (async () => {
      try {
        const qs = new URLSearchParams({
          lat: String(locationLat),
          lng: String(locationLng),
        });
        if (vendorId) qs.set("vendorId", vendorId);
        const r = await fetch(`/api/storefront/delivery-estimate?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const j = (await r.json()) as {
          deliveryFeeAgorot?: number;
          distanceKm?: number | null;
        };
        if (!active) return;
        if (typeof j.deliveryFeeAgorot === "number") setDeliveryFee(j.deliveryFeeAgorot);
        setDistanceKm(typeof j.distanceKm === "number" ? j.distanceKm : null);
      } finally {
        if (active) setEstimating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [locationLat, locationLng, vendorId]);

  const total = subtotal + deliveryFee - discountAmount;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  useEffect(() => {
    trackEvent("checkout_step", {
      step,
      items_count: items.length,
      subtotal,
      total,
      vendor_id: vendorId,
    });
  }, [items.length, step, subtotal, total, vendorId]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSubmitError("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
      },
      () => setSubmitError("تعذر جلب موقعك الحالي."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const placeOrder = async () => {
    setSubmitError(null);
    setSubmitting(true);
    const id = `ord_${Date.now()}`;
    const shortCode = `#${1100 + Math.floor(Math.random() * 9000)}`;
    const fullAddress = [address.trim(), zipCode.trim() ? `رمز بريدي: ${zipCode.trim()}` : ""]
      .filter(Boolean)
      .join(" — ");

    const newOrder: Order = {
      id,
      shortCode,
      customer: {
        name: name || "زبون",
        phone: phone || "+9647700000000",
        address: fullAddress || "لم يُحدد",
        location: { lat: locationLat ?? 33.31, lng: locationLng ?? 44.36 },
      },
      items,
      subtotal,
      deliveryFee,
      total,
      status: "new",
      payment,
      notes,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddressId || null,
          customerName: name || "زبون",
          customerPhone: phone || "+9647700000000",
          customerAddress: fullAddress || "لم يُحدد",
          locationLat,
          locationLng,
          subtotal,
          deliveryFee,
          discountAmount,
          couponCode: appliedCouponCode,
          total,
          paymentMethod: payment,
          notes,
          items,
        }),
      });

      if (response.status === 401) {
        setSubmitError("يجب تسجيل الدخول لإتمام الطلب. افتح «حسابي» أو سجّل الدخول ثم أعد المحاولة.");
        router.push("/login?next=/checkout");
        return;
      }

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error ?? "تعذر حفظ الطلب في قاعدة البيانات.");
      }

      const created = (await response.json()) as {
        id: string;
        shortCode: string;
        createdAt: string;
      };
      trackEvent("order_placed", {
        order_id: created.id,
        short_code: created.shortCode,
        total,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        coupon_code: appliedCouponCode,
        payment_method: payment,
      });
      addOrder({ ...newOrder, id: created.id, shortCode: created.shortCode, createdAt: created.createdAt });
      clearCart();
      if (payment === "card") {
        const payRes = await fetch("/api/payments/stripe/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: created.id }),
        });
        if (payRes.ok) {
          const payJson = (await payRes.json()) as { url?: string };
          if (payJson.url) {
            window.location.href = payJson.url;
            return;
          }
        }
      }
      router.push(`/orders/${created.id}`);
    } catch {
      addOrder(newOrder);
      clearCart();
      router.push(`/orders/${id}`);
      setSubmitError("تم حفظ الطلب محلياً. تأكد من إعداد Supabase للمزامنة.");
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue = () => {
    if (step === 1) return items.length > 0;
    if (step === 2) {
      return (
        Boolean(name.trim()) &&
        Boolean(phone.trim()) &&
        Boolean(address.trim() || selectedAddressId) &&
        !addressesLoading
      );
    }
    if (step === 3) return Boolean(time) && !estimating;
    return true;
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponBusy(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/storefront/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; code?: string; discountAmount?: number };
      if (!r.ok || !j.ok) {
        setAppliedCouponCode(null);
        setDiscountAmount(0);
        setSubmitError("الكوبون غير صالح أو منتهي.");
        return;
      }
      setAppliedCouponCode(j.code ?? code);
      setDiscountAmount(Math.max(0, Math.round(j.discountAmount ?? 0)));
    } finally {
      setCouponBusy(false);
    }
  };

  if (items.length === 0 && step !== 4) {
    return (
      <div className="mx-auto w-full max-w-screen-md px-4 py-12 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-500">
          <ShoppingBag className="h-10 w-10" strokeWidth={1.8} />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">سلتك فارغة</h1>
        <p className="mt-1 text-sm text-neutral-500">
          أضف منتجات لتتمكن من إكمال الطلب
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-full bg-brand-gradient px-6 py-3 text-sm font-extrabold text-white shadow-pop"
        >
          العودة للمتجر
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 pb-12">
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => (step === 1 ? router.back() : back())}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100"
          aria-label="رجوع"
        >
          <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <h1 className="text-lg font-extrabold">إتمام الطلب</h1>
      </div>

      {/* Stepper */}
      <ol className="mt-5 grid grid-cols-4 gap-2">
        {steps.map((s) => {
          const done = step > s.id;
          const active = step === s.id;
          const Icon = s.icon;
          return (
            <li key={s.id} className="flex flex-col items-center gap-1">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold transition-all ${
                  done
                    ? "bg-emerald-500 text-white shadow-pop"
                    : active
                      ? "bg-brand-gradient text-white shadow-pop"
                      : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {done ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                )}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  active || done ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          {step === 1 && (
            <section>
              <h2 className="mb-3 text-base font-extrabold">
                مراجعة منتجات السلة
              </h2>
              <ul className="space-y-2.5">
                {items.map((it) => (
                  <li
                    key={it.productId}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/5">
                      <Image
                        src={it.image}
                        alt={it.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-sm font-bold">
                        {it.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        {it.quantity} × {it.unit}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-brand-600">
                      {formatPrice(it.price * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3">
              <h2 className="text-base font-extrabold">عنوان التوصيل</h2>

              <button
                type="button"
                onClick={useCurrentLocation}
                className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-3 text-start ring-1 ring-brand-100 hover:bg-brand-100"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-pop">
                  <Navigation className="h-5 w-5" strokeWidth={2.4} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold text-brand-700">
                    استخدم موقعي الحالي
                  </span>
                  <span className="block text-[12px] text-brand-600/80">
                    تحديد تلقائي عبر GPS
                  </span>
                </span>
                <ArrowLeft className="h-5 w-5 text-brand-600" strokeWidth={2.4} />
              </button>

              <Field label="الاسم الكامل">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: ليلى الحسني"
                  className="input"
                />
              </Field>

              <Field label="رقم الهاتف">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+964770XXXXXXX"
                  className="input"
                />
              </Field>

              <Field label="العنوان التفصيلي">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المحافظة - المنطقة - الشارع - علامة مميزة"
                  rows={3}
                  className="input"
                />
              </Field>
              <Field label="الرمز البريدي (اختياري)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="مثال: 10011"
                  className="input"
                />
              </Field>

              {savedAddresses.length > 0 && (
                <Field label="أو اختر من عناوينك المحفوظة">
                  <select
                    value={selectedAddressId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedAddressId(id);
                      const row = savedAddresses.find((a) => a.id === id);
                      if (row) {
                        setAddress([row.line1, row.city].filter(Boolean).join(" - "));
                        if (row.lat != null && row.lng != null) {
                          setLocationLat(row.lat);
                          setLocationLng(row.lng);
                        }
                      }
                    }}
                    className="input"
                  >
                    <option value="">اختيار عنوان محفوظ</option>
                    {savedAddresses.map((row) => (
                      <option key={row.id} value={row.id}>
                        {(row.label ? `${row.label} - ` : "") +
                          row.line1 +
                          (row.city ? ` (${row.city})` : "")}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {locationLat != null && locationLng != null && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-brand-700">
                    الموقع المحدد: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
                  </p>
                  <div className="overflow-hidden rounded-xl ring-1 ring-brand-100">
                    <iframe
                      title="موقع عنوان التوصيل"
                      src={`https://maps.google.com/maps?q=${locationLat},${locationLng}&z=15&output=embed`}
                      loading="lazy"
                      className="h-40 w-full border-0"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}

              <Field label="ملاحظات للسائق (اختياري)">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: الباب الأزرق، الطابق الثاني"
                  className="input"
                />
              </Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-3">
              <h2 className="text-base font-extrabold">وقت التوصيل</h2>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "asap", label: "بأسرع وقت", note: "خلال 30 دقيقة" },
                    { id: "30min", label: "خلال 30 دقيقة", note: "موعد محدد" },
                    { id: "1hour", label: "خلال ساعة", note: "موعد محدد" },
                    { id: "scheduled", label: "موعد لاحق", note: "اختر التاريخ" },
                  ] as { id: DeliveryTime; label: string; note: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTime(opt.id)}
                    className={`rounded-2xl p-3 text-start ring-1 transition-colors ${
                      time === opt.id
                        ? "bg-brand-50 ring-brand-300"
                        : "bg-white ring-black/5 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="block text-sm font-extrabold text-neutral-900">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {opt.note}
                    </span>
                  </button>
                ))}
              </div>

              <h2 className="mt-4 text-base font-extrabold">طريقة الدفع</h2>
              <div className="grid grid-cols-2 gap-2">
                <PayChoice
                  active={payment === "cash"}
                  onClick={() => setPayment("cash")}
                  icon={Banknote}
                  label="نقداً عند الاستلام"
                  note="بدون رسوم إضافية"
                />
                <PayChoice
                  active={payment === "card"}
                  onClick={() => setPayment("card")}
                  icon={CreditCard}
                  label="بطاقة"
                  note="ماستر / فيزا / كي كارد"
                />
              </div>

              <h2 className="mt-4 text-base font-extrabold">كوبون خصم</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="ادخل كود الخصم"
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => void applyCoupon()}
                  disabled={couponBusy || !couponCode.trim()}
                  className="h-11 rounded-xl bg-neutral-900 px-4 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  {couponBusy ? "..." : "تطبيق"}
                </button>
              </div>
              {appliedCouponCode && (
                <p className="text-xs font-bold text-emerald-700">
                  تم تطبيق الكوبون: {appliedCouponCode}
                </p>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-3">
              <h2 className="text-base font-extrabold">تأكيد الطلب</h2>
              <ConfirmRow label="الزبون" value={name || "—"} />
              <ConfirmRow label="الهاتف" value={phone || "—"} />
              <ConfirmRow label="العنوان" value={address || "—"} />
              <ConfirmRow
                label="وقت التوصيل"
                value={
                  {
                    asap: "بأسرع وقت ممكن",
                    "30min": "خلال 30 دقيقة",
                    "1hour": "خلال ساعة",
                    scheduled: "موعد لاحق",
                  }[time]
                }
              />
              <ConfirmRow
                label="الدفع"
                value={payment === "cash" ? "نقداً عند الاستلام" : "بطاقة"}
              />
              {notes && <ConfirmRow label="ملاحظات" value={notes} />}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* الإجمالي */}
      <div className="mt-6 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-neutral-600">
            <dt>المجموع الفرعي</dt>
            <dd className="font-bold">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <dt>التوصيل</dt>
            <dd className="font-bold">
              {formatPrice(deliveryFee)}
              {estimating ? " (جار الحساب...)" : distanceKm != null ? ` (~${distanceKm} كم)` : ""}
            </dd>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-700">
              <dt>الخصم</dt>
              <dd className="font-bold">- {formatPrice(discountAmount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-2 text-base">
            <dt className="font-extrabold text-neutral-900">المجموع الكلي</dt>
            <dd className="font-extrabold text-brand-600">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>
      </div>

      {/* الأزرار */}
      <div className="mt-4 flex items-center gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-white font-bold text-neutral-700 shadow-soft ring-1 ring-black/5 hover:bg-neutral-100"
          >
            السابق
          </button>
        )}
        <button
          type="button"
          disabled={!canContinue() || submitting}
          onClick={step === 4 ? placeOrder : next}
          className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-extrabold text-white shadow-pop transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "جاري الإرسال..." : step === 4 ? "تأكيد الطلب" : "متابعة"}
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>
      {submitError && (
        <p className="mt-2 text-center text-xs font-bold text-amber-700">
          {submitError}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-neutral-700">
        {label}
      </span>
      {children}
      <style>{`.input{display:block;width:100%;border-radius:1rem;background:#fff;padding:0.75rem 1rem;font-size:0.9rem;font-weight:600;color:#0a0a0a;outline:none;box-shadow:0 0 0 1px rgba(0,0,0,0.06);transition:box-shadow .15s}.input:focus{box-shadow:0 0 0 2px var(--color-brand-300)}`}</style>
    </label>
  );
}

function PayChoice({
  active,
  onClick,
  icon: Icon,
  label,
  note,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl p-3 text-start ring-1 transition-colors ${
        active ? "bg-brand-50 ring-brand-300" : "bg-white ring-black/5"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          active ? "bg-brand-500 text-white" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="text-[11px] text-neutral-500">{note}</span>
      </span>
    </button>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <span className="text-[12px] font-bold text-neutral-500">{label}</span>
      <span className="text-end text-sm font-bold text-neutral-900">
        {value}
      </span>
    </div>
  );
}
