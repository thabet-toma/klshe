import { NextResponse } from "next/server";
import { guardOrError } from "@/lib/auth/guard";
import { listDeliveryDrivers } from "@/lib/supabase/delivery-drivers";

// قائمة السائقين تحوي بيانات شخصية (اسم/هاتف). تحت نموذج بلا-RLS،
// الحارس هو الحماية الوحيدة: أدمن/بائع فقط (للتعيين والقوائم المسموحة).
export async function GET() {
  const identity = await guardOrError({
    roles: ["platform_admin", "vendor_staff"],
    verifyDbRole: true,
  });
  if (identity instanceof NextResponse) return identity;

  const drivers = await listDeliveryDrivers();
  return NextResponse.json({ drivers });
}
