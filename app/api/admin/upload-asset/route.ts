import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/require-platform-admin";
import { createServerSupabase, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Supabase غير مهيأ." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const file = formData.get("file");
  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "الملف مطلوب في الحقل file." }, { status: 400 });
  }
  if (!vendorId) {
    return NextResponse.json({ error: "vendorId مطلوب." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "حجم الملف يتجاوز 5MB." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type || "")) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const ext = extFromMime(file.type);
  const path = `${vendorId}/product-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("vendor-assets").upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = getSupabaseUrl();
  if (!base) return NextResponse.json({ error: "Supabase URL غير مهيأ." }, { status: 503 });
  const { data } = supabase.storage.from("vendor-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
