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
  unitCost: number;
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
    .from("vendor_purchase_invoices")
    .select("id, supplier_id, total, paid, status, note, issued_at, vendor_suppliers(name)")
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
    supplierId?: string | null;
    paid?: number;
    note?: string;
    items?: ItemInput[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON." }, { status: 400 });
  }
  const items = (body.items ?? []).filter(
    (i) => i && i.name && Number(i.qty) > 0 && Number(i.unitCost) >= 0,
  );
  if (items.length === 0) {
    return NextResponse.json({ error: "أضف بنداً واحداً على الأقل." }, { status: 400 });
  }

  const total = items.reduce(
    (s, i) => s + Math.round(Number(i.unitCost)) * Number(i.qty),
    0,
  );
  const paid = Math.min(total, Math.max(0, Math.round(Number(body.paid ?? 0))));
  const status = paid === 0 ? "unpaid" : paid >= total ? "paid" : "partial";

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) return svcErr;
  if (!supabase) return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });

  const { data: invoice, error: invErr } = await supabase
    .from("vendor_purchase_invoices")
    .insert({
      vendor_id: vendorId,
      supplier_id: body.supplierId ?? null,
      total,
      paid,
      status,
      note: body.note?.trim() || null,
      created_by: userId,
    })
    .select("*")
    .single();
  if (invErr || !invoice) {
    return NextResponse.json({ error: invErr?.message ?? "تعذر إنشاء الفاتورة." }, { status: 500 });
  }

  const itemRows = items.map((i) => {
    const lineTotal = Math.round(Number(i.unitCost)) * Number(i.qty);
    return {
      invoice_id: invoice.id,
      product_id: i.productId ?? null,
      name_snapshot: i.name.trim(),
      qty: Number(i.qty),
      unit_cost: Math.round(Number(i.unitCost)),
      total: lineTotal,
    };
  });
  const { error: itemsErr } = await supabase
    .from("vendor_purchase_invoice_items")
    .insert(itemRows);
  if (itemsErr) {
    await supabase.from("vendor_purchase_invoices").delete().eq("id", invoice.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}
