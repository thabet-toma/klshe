import AdminShell from "@/app/components/admin/AdminShell";
import AdminVendorsClient from "@/app/components/admin/AdminVendorsClient";

export default function AdminVendorsPage() {
  return (
    <AdminShell title="المتاجر" subtitle="إدارة المتاجر، التفعيل/الإيقاف والعمولات">
      <AdminVendorsClient />
    </AdminShell>
  );
}
