import AdminShell from "@/app/components/admin/AdminShell";
import AdminPlatformSettingsClient from "@/app/components/admin/AdminPlatformSettingsClient";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="إعدادات المنصة" subtitle="إعدادات عامة تُطبَّق على كامل النظام">
      <AdminPlatformSettingsClient />
    </AdminShell>
  );
}
