import { NextResponse } from "next/server";
import { guardOrError } from "@/lib/auth/guard";

type DashboardRoute = {
  label: string;
  href: string;
  icon: string;
  description: string;
};

const ROLE_DASHBOARDS: Record<string, DashboardRoute[]> = {
  customer: [
    { label: "المتجر", href: "/", icon: "store", description: "تصفّح المنتجات والطلب" },
    { label: "طلباتي", href: "/orders", icon: "orders", description: "تتبّع الطلبات السابقة" },
    { label: "حسابي", href: "/account", icon: "account", description: "إدارة الملف والعناوين" },
  ],
  vendor_staff: [
    { label: "لوحة المتجر", href: "/vendor", icon: "vendor", description: "إدارة الطلبات والمنتجات" },
    { label: "الطلبات", href: "/vendor/orders", icon: "orders", description: "طلبات المتجر الحالية" },
    { label: "المالية", href: "/vendor/payouts", icon: "finance", description: "الكشوفات والتحويلات" },
  ],
  driver: [
    { label: "لوحة السائق", href: "/driver", icon: "driver", description: "الطلبات المتاحة والتوصيل" },
    { label: "طلباتي", href: "/driver/orders", icon: "orders", description: "طلبات التوصيل النشطة" },
  ],
  platform_admin: [
    { label: "لوحة الإدارة", href: "/admin", icon: "admin", description: "إدارة المنصة بالكامل" },
    { label: "الطلبات", href: "/admin/orders", icon: "orders", description: "جميع الطلبات" },
    { label: "المتاجر", href: "/admin/vendors", icon: "vendors", description: "إدارة المتاجر" },
    { label: "السائقون", href: "/admin/drivers", icon: "drivers", description: "إدارة السائقين" },
    { label: "المالية", href: "/admin/payouts", icon: "finance", description: "التقارير المالية" },
  ],
};

export async function GET() {
  const identity = await guardOrError({ verifyDbRole: true });
  if (identity instanceof NextResponse) return identity;

  const dashboards = ROLE_DASHBOARDS[identity.role] ?? ROLE_DASHBOARDS["customer"];

  return NextResponse.json({
    role: identity.role,
    dashboards,
  });
}
