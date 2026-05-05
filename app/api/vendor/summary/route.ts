import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";

export async function GET(request: Request) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const requestedVendor = searchParams.get("vendorId");
  const vendorId = pickVendorId(vendorIds, requestedVendor);
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({
        vendor: {
          id: vendorId,
          name: "جيتك — المتجر الرئيسي",
          slug: "jetek-main",
        },
        productsActive: 0,
        ordersToday: 0,
        revenueToday: 0,
        pendingOrders: 0,
      });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: vendor },
    { count: productsCount },
    { data: ordersToday },
    { count: pendingCount },
    { data: ordersMonth },
    { data: lowStock },
    { data: salesInvoicesMonth },
  ] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, slug")
      .eq("id", vendorId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("id, total, status, created_at")
      .eq("vendor_id", vendorId)
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .in("status", ["new", "preparing", "dispatched", "on_way"]),
    supabase
      .from("orders")
      .select("id, total, status, created_at")
      .eq("vendor_id", vendorId)
      .eq("status", "delivered")
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("vendor_inventory")
      .select("id, stock, min_stock, products(name)")
      .eq("vendor_id", vendorId)
      .order("stock", { ascending: true })
      .limit(20),
    supabase
      .from("vendor_sales_invoices")
      .select("id, total")
      .eq("vendor_id", vendorId)
      .gte("issued_at", startOfMonth.toISOString()),
  ]);

  const todayList = ordersToday ?? [];
  const revenueToday = todayList
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + Number(o.total), 0);

  const revenueMonth =
    (ordersMonth ?? []).reduce((s, o) => s + Number(o.total), 0) +
    (salesInvoicesMonth ?? []).reduce((s, o) => s + Number(o.total), 0);

  const lowStockItems = (lowStock ?? [])
    .filter((row) => Number(row.stock) <= Number(row.min_stock))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      name: (row.products as { name?: string } | null)?.name ?? "—",
      stock: Number(row.stock),
      minStock: Number(row.min_stock),
    }));

  return NextResponse.json({
    vendor: vendor ?? null,
    productsActive: productsCount ?? 0,
    ordersToday: todayList.length,
    revenueToday,
    revenueMonth,
    pendingOrders: pendingCount ?? 0,
    lowStockItems,
    lowStockCount: lowStockItems.length,
  });
}
