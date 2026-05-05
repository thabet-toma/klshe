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

type VendorAction = "accept" | "reject" | "ready";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "معرّف الطلب مطلوب." }, { status: 400 });
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
  if (action !== "accept" && action !== "reject" && action !== "ready") {
    return NextResponse.json(
      { error: 'يرجى إرسال action واحدة من: accept, reject, ready' },
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
              ? "accepted"
              : action === "reject"
                ? "rejected"
                : "ready",
          accepted_at:
            action === "accept" ? new Date().toISOString() : null,
          ready_at: action === "ready" ? new Date().toISOString() : null,
          cancellation_reason:
            action === "reject"
              ? (body.cancellationReason?.trim() ?? "مرفوض من المتجر")
              : null,
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
    if (order.status !== "new") {
      return NextResponse.json(
        { error: "يمكن قبول الطلب فقط وهو بحالة «جديد»." },
        { status: 409 },
      );
    }
    patch.status = "accepted";
    patch.accepted_at = now;
  } else if (action === "reject") {
    if (order.status !== "new" && order.status !== "accepted") {
      return NextResponse.json(
        { error: "لا يمكن الرفض في هذه الحالة." },
        { status: 409 },
      );
    }
    patch.status = "rejected";
    patch.cancellation_reason =
      body.cancellationReason?.trim() || "مرفوض من المتجر";
  } else if (action === "ready") {
    if (order.status !== "accepted" && order.status !== "preparing") {
      return NextResponse.json(
        { error: "يمكن تعيين «جاهز» بعد القبول أو التحضير." },
        { status: 409 },
      );
    }
    patch.status = "ready";
    patch.ready_at = now;
  }

  const { data: updated, error: upErr } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .select(
      "id, status, accepted_at, ready_at, picked_at, delivered_at, cancellation_reason",
    )
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ order: updated });
}
