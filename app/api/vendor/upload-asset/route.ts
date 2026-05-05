import { NextResponse } from "next/server";
import {
  assertVendorApi,
  getServiceSupabaseOrError,
  pickVendorId,
  skipVendorAuthBecauseDemo,
} from "@/lib/auth/require-vendor-staff";
import { getSupabaseUrl } from "@/lib/supabase/env";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: "الرفع يتطلب تهيئة Supabase بالكامل (المفتاح السري والحاوية)." },
        { status: 503 },
      );
    }
    return svcErr;
  }
  if (!supabase) {
    return NextResponse.json({ error: "خادم غير مهيأ." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const file = formData.get("file");
  const kindRaw = formData.get("kind");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ملف مطلوب في الحقل file." }, { status: 400 });
  }
  const kind =
    kindRaw === "logo" || kindRaw === "banner" ? kindRaw : null;
  if (!kind) {
    return NextResponse.json(
      { error: 'kind يجب أن يكون logo أو banner' },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز 5 ميجابايت." },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "نوع الملف غير مسموح (jpeg, png, webp, gif)." },
      { status: 400 },
    );
  }

  const ext = extFromMime(mime);
  const path = `${vendorId}/${kind}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("vendor-assets")
    .upload(path, buf, {
      contentType: mime,
      upsert: true,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const base = getSupabaseUrl();
  if (!base) {
    return NextResponse.json({ error: "عنوان Supabase غير مهيأ." }, { status: 503 });
  }

  const { data } = supabase.storage.from("vendor-assets").getPublicUrl(path);
  const url = data.publicUrl;

  return NextResponse.json({ url, path });
}
