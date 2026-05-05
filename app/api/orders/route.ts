import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/auth/route-supabase";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEFAULT_VENDOR_ID } from "@/lib/vendors/default-vendor";
import { normalizeAgorot } from "@/lib/currency/agorot";
import { createOrderSchema, type CreateOrderInput } from "@/lib/schemas/orders";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { corsHeaders, optionsCorsResponse } from "@/lib/security/cors";

export async function OPTIONS(request: Request) {
  return optionsCorsResponse(request.headers.get("origin"));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    key: `orders:${ip}`,
    limit: 20,
    windowMs: 60_000,
    windowLabel: "1 m",
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: corsHeaders(origin) });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503, headers: corsHeaders(origin) },
    );
  }

  let payload: CreateOrderInput;
  try {
    const raw = await request.json();
    const parsed = createOrderSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order payload." }, { status: 400, headers: corsHeaders(origin) });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: corsHeaders(origin) });
  }

  const routeSb = await createRouteHandlerSupabase();
  if (!routeSb) {
    return NextResponse.json(
      { error: "لم يُضبط الاتصال بـ Supabase." },
      { status: 503, headers: corsHeaders(origin) },
    );
  }

  const {
    data: { user },
  } = await routeSb.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول لإتمام الطلب." },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  const customerId = user.id;

  if (!payload.items?.length) {
    return NextResponse.json({ error: "Order must contain items." }, { status: 400, headers: corsHeaders(origin) });
  }

  const shortCode = `#${1100 + Math.floor(Math.random() * 9000)}`;

  const supabase = createServerSupabase();

  let resolvedAddressId: string | null = null;
  let customerAddressLine = payload.customerAddress.trim();
  let locationLat = payload.locationLat ?? null;
  let locationLng = payload.locationLng ?? null;

  const rawAddrId =
    typeof payload.addressId === "string" ? payload.addressId.trim() : "";
  if (rawAddrId) {
    const { data: addrRow } = await supabase
      .from("addresses")
      .select("id, line1, city, lat, lng, label")
      .eq("id", rawAddrId)
      .eq("profile_id", customerId)
      .maybeSingle();

    if (!addrRow) {
      return NextResponse.json(
        { error: "العنوان غير موجود أو لا يخص حسابك." },
        { status: 400, headers: corsHeaders(origin) },
      );
    }
    resolvedAddressId = addrRow.id;
    const parts = [addrRow.line1, addrRow.city, addrRow.label]
      .filter(Boolean)
      .join(" — ");
    if (parts) customerAddressLine = parts;
    if (addrRow.lat != null && addrRow.lng != null) {
      locationLat = addrRow.lat;
      locationLng = addrRow.lng;
    }
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", customerId)
    .maybeSingle();

  const customerName =
    payload.customerName.trim() ||
    profileRow?.full_name?.trim() ||
    "زبون";
  const customerPhone =
    payload.customerPhone.trim() || profileRow?.phone?.trim() || "";
  if (!customerPhone) {
    return NextResponse.json(
      { error: "رقم الهاتف مطلوب في الملف أو في النموذج." },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const productIds = [...new Set(payload.items.map((i) => i.productId))];
  const { data: productRows, error: prodErr } = await supabase
    .from("products")
    .select("id, vendor_id")
    .in("id", productIds);

  if (prodErr) {
    return NextResponse.json({ error: prodErr.message }, { status: 500 });
  }

  const foundIds = new Set((productRows ?? []).map((p) => p.id));
  if (foundIds.size !== productIds.length) {
    return NextResponse.json(
      { error: "بعض المنتجات غير موجودة في المتجر." },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const vendorIdsFromProducts = [
    ...new Set(
      (productRows ?? []).map((p) => p.vendor_id).filter((v): v is string => Boolean(v)),
    ),
  ];

  let resolvedVendorId: string | null = null;
  if (vendorIdsFromProducts.length > 1) {
    return NextResponse.json(
      {
        error:
          "السلة تحتوي منتجات من أكثر من متجر. أفرّغ السلة واطلب من متجر واحد.",
      },
      { status: 400, headers: corsHeaders(origin) },
    );
  }
  if (vendorIdsFromProducts.length === 1) {
    resolvedVendorId = vendorIdsFromProducts[0];
  } else {
    resolvedVendorId = DEFAULT_VENDOR_ID;
  }

  const subtotalAgorot = normalizeAgorot(payload.subtotal);
  const deliveryFeeAgorot = normalizeAgorot(payload.deliveryFee);
  const discountAmountAgorot = normalizeAgorot(payload.discountAmount ?? 0);
  const totalAgorot = normalizeAgorot(payload.total);

  if (totalAgorot !== subtotalAgorot + deliveryFeeAgorot - discountAmountAgorot) {
    return NextResponse.json(
      { error: "إجمالي الطلب غير متوافق مع المعادلة النهائية." },
      { status: 400 },
    );
  }

  let resolvedCouponCode: string | null = null;
  let resolvedDiscountAmount = discountAmountAgorot;
  const code = payload.couponCode?.trim();
  if (code) {
    const { data: couponResult, error: couponErr } = await supabase.rpc("apply_coupon", {
      p_code: code,
      p_subtotal: subtotalAgorot,
    });
    if (couponErr) {
      return NextResponse.json({ error: couponErr.message }, { status: 500, headers: corsHeaders(origin) });
    }
    const coupon = couponResult as { ok?: boolean; code?: string; discount_amount?: number; error?: string };
    if (!coupon?.ok) {
      return NextResponse.json({ error: "الكوبون غير صالح." }, { status: 400, headers: corsHeaders(origin) });
    }
    resolvedCouponCode = coupon.code ?? code;
    resolvedDiscountAmount = Math.max(0, Math.round(coupon.discount_amount ?? 0));
    if (resolvedDiscountAmount !== discountAmountAgorot) {
      return NextResponse.json({ error: "قيمة الخصم غير متطابقة مع الخادم." }, { status: 400, headers: corsHeaders(origin) });
    }
  }

  const { data: createdOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      short_code: shortCode,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddressLine || "لم يُحدد",
      location_lat: locationLat,
      location_lng: locationLng,
      subtotal: subtotalAgorot,
      delivery_fee: deliveryFeeAgorot,
      total: totalAgorot,
      discount_amount: resolvedDiscountAmount,
      coupon_code: resolvedCouponCode,
      status: "new",
      payment_method: payload.paymentMethod,
      notes: payload.notes ?? null,
      vendor_id: resolvedVendorId,
      customer_id: customerId,
      address_id: resolvedAddressId,
    })
    .select("*")
    .single();

  if (orderError || !createdOrder) {
    return NextResponse.json(
      { error: orderError?.message ?? "Failed to create order." },
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  const orderItems = payload.items.map((item) => ({
    order_id: createdOrder.id,
    product_id: item.productId,
    product_name: item.name,
    unit_price: normalizeAgorot(item.price),
    quantity: item.quantity,
    line_total: normalizeAgorot(item.price) * item.quantity,
  }));

  const [{ error: itemsError }, { error: txError }] = await Promise.all([
    supabase.from("order_items").insert(orderItems),
    supabase.from("transactions").insert({
      order_id: createdOrder.id,
      type: "sale",
      amount: totalAgorot,
      vendor_id: resolvedVendorId,
      payment_method: payload.paymentMethod,
      note: "فاتورة مبيعات ناتجة عن طلب متجر",
    }),
  ]);

  if (itemsError || txError) {
    return NextResponse.json(
      { error: itemsError?.message ?? txError?.message ?? "Failed to save order details." },
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  return NextResponse.json(
    {
      id: createdOrder.id,
      shortCode: createdOrder.short_code,
      createdAt: createdOrder.created_at,
    },
    { headers: corsHeaders(origin) },
  );
}
