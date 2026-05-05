import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";

type ItemInput = {
  productId?: string | null;
  name: string;
  qty: number;
  unitPrice: number;
};

export async function GET(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) return NextResponse.json({ error: "متجر غير صالح." }, { status: 400 });

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) return NextResponse.json({ invoices: [] });
    return svcErr;
  }
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { data, error } = await supabase
    .from("vendor_sales_invoices")
    .select(
      "id, customer_name, customer_phone, payment_method, subtotal, discount, total, note, issued_at",
    )
    .eq("vendor_id", vendorId)
    .order("issued_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(request: Request) {
  const { denied, vendorIds, userId } = await assertVendorApi();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) return NextResponse.json({ error: "متجر غير صالح." }, { status: 400 });

  let body: {
    customerId?: string | null;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: "cash" | "card" | "credit";
    discount?: number;
    note?: string;
    items?: ItemInput[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }

  const items = (body.items ?? []).filter(
    (i) => i && i.name && Number(i.qty) > 0 && Number(i.unitPrice) >= 0,
  );
  if (items.length === 0) {
    return NextResponse.json({ error: "أضف بنداً واحداً على الأقل." }, { status: 400 });
  }

  const subtotal = items.reduce(
    (s, i) => s + Math.round(Number(i.unitPrice)) * Number(i.qty),
    0,
  );
  const discount = Math.max(0, Math.round(Number(body.discount ?? 0)));
  const total = Math.max(0, subtotal - discount);
  const paymentMethod = body.paymentMethod ?? "cash";

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { data: invoice, error: invErr } = await supabase
    .from("vendor_sales_invoices")
    .insert({
      vendor_id: vendorId,
      customer_id: body.customerId ?? null,
      customer_name: body.customerName?.trim() || null,
      customer_phone: body.customerPhone?.trim() || null,
      payment_method: paymentMethod,
      subtotal,
      discount,
      total,
      note: body.note?.trim() || null,
      created_by: userId,
    })
    .select("*")
    .single();
  if (invErr || !invoice) {
    return NextResponse.json({ error: invErr?.message ?? "تعذر إنشاء الفاتورة." }, { status: 500 });
  }

  const itemRows = items.map((i) => {
    const lineTotal = Math.round(Number(i.unitPrice)) * Number(i.qty);
    return {
      invoice_id: invoice.id,
      product_id: i.productId ?? null,
      name_snapshot: i.name.trim(),
      qty: Number(i.qty),
      unit_price: Math.round(Number(i.unitPrice)),
      total: lineTotal,
    };
  });
  const { error: itemsErr } = await supabase
    .from("vendor_sales_invoice_items")
    .insert(itemRows);
  if (itemsErr) {
    await supabase.from("vendor_sales_invoices").delete().eq("id", invoice.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  if (paymentMethod === "credit" && body.customerId) {
    await supabase.from("vendor_customer_transactions").insert({
      customer_id: body.customerId,
      type: "debt",
      amount: total,
      note: `فاتورة مبيعات #${invoice.id.slice(0, 8)}`,
    });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}
