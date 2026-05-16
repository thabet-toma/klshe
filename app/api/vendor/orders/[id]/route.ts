import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

type VendorAction = "accept" | "reject" | "preparing" | "ready";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "معرف الطلب مطلوب." }, { status: 400 });
  }

  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  let body: { action?: VendorAction; cancellationReason?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "reject" && action !== "preparing" && action !== "ready") {
    return NextResponse.json(
      { error: "يرجى إرسال action واحدة من: accept, reject, preparing, ready" },
      { status: 400 },
    );
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({
        order: {
          id,
          status:
            action === "accept"
              ? "broadcast"
              : action === "reject"
                ? "rejected"
                : "broadcast",
          prep_status:
            action === "preparing"
              ? "preparing"
              : action === "ready"
                ? "ready"
                : undefined,
          accepted_at:
            action === "accept" ? new Date().toISOString() : undefined,
          ready_at: action === "ready" ? new Date().toISOString() : undefined,
          cancellation_reason:
            action === "reject"
              ? (body.cancellationReason?.trim() ?? "مرفوض من المتجر")
              : undefined,
        },
      });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
  }

  const order = row as OrderRow;
  if (order.vendor_id !== vendorId) {
    return NextResponse.json({ error: "هذا الطلب لا ينتمي لمتجرك." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const patch: OrderUpdate = {};

  if (action === "accept") {
    // الدورة الهجينة: الطلب مقبول تلقائياً عند الإنشاء — لا عملية فعلية
    return NextResponse.json({ order: row });
  } else if (action === "reject") {
    if (
      order.status === "dispatched" ||
      order.status === "on_way" ||
      order.status === "delivered"
    ) {
      return NextResponse.json(
        { error: "لا يمكن رفض الطلب بعد إرساله." },
        { status: 409 },
      );
    }
    patch.status = "rejected";
    patch.cancellation_reason =
      body.cancellationReason?.trim() || "مرفوض من المتجر";
  } else if (action === "preparing") {
    if (order.status !== "broadcast" && order.status !== "accepted") {
      return NextResponse.json(
        { error: "لا يمكن بدء التحضير في هذه الحالة." },
        { status: 409 },
      );
    }
    if (order.claimed_by !== null) {
      return NextResponse.json(
        { error: "لا يمكن تعديل الطلب بعد مطالبته." },
        { status: 409 },
      );
    }
    patch.prep_status = "preparing";
  } else if (action === "ready") {
    if (order.status !== "broadcast" && order.status !== "accepted") {
      return NextResponse.json(
        { error: "لا يمكن تعيين «جاهز» في هذه الحالة." },
        { status: 409 },
      );
    }
    if (order.claimed_by !== null) {
      return NextResponse.json(
        { error: "لا يمكن تعديل الطلب بعد مطالبته." },
        { status: 409 },
      );
    }
    patch.prep_status = "ready";
    patch.ready_at = now;
  }

  const { data: updated, error: upErr } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .select(
      "id, status, prep_status, accepted_at, ready_at, picked_at, delivered_at, cancellation_reason, claimed_by",
    )
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ order: updated });
}
