import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type MenuCategoryUpdate = Database["public"]["Tables"]["menu_categories"]["Update"];

type DbClient = ReturnType<typeof createServerSupabase>;

async function assertMenuCategoryVendor(
  supabase: DbClient,
  menuCategoryId: string,
  vendorIds: string[],
) {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("vendor_id")
    .eq("id", menuCategoryId)
    .maybeSingle();

  if (error || !data?.vendor_id || !vendorIds.includes(data.vendor_id)) {
    return false;
  }
  return true;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const vendorId = pickVendorId(vendorIds, searchParams.get("vendorId"));
  if (!vendorId) {
    return NextResponse.json({ error: "لا يوجد متجر صالح." }, { status: 400 });
  }

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({ error: "لا يمكن التعديل دون Supabase." }, { status: 503 });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { id } = await params;
  const ok = await assertMenuCategoryVendor(supabase, id, vendorIds);
  if (!ok) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  let body: { name?: string; sortOrder?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسم الطلب ليس JSON صالحاً." }, { status: 400 });
  }

  const patch: MenuCategoryUpdate = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.sortOrder === "number" && !Number.isNaN(body.sortOrder)) {
    patch.sort_order = Math.floor(body.sortOrder);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا حقول للتحديث." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("menu_categories")
    .update(patch)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ menuCategory: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { denied, vendorIds } = await assertVendorApi();
  if (denied) return denied;

  const { error: svcErr, supabase } = getServiceSupabaseOrError();
  if (svcErr) {
    if (skipVendorAuthBecauseDemo()) {
      return NextResponse.json({ error: "لا يمكن الحذف دون Supabase." }, { status: 503 });
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  const { id } = await params;
  const ok = await assertMenuCategoryVendor(supabase, id, vendorIds);
  if (!ok) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
