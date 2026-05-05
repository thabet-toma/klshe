import AdminShell from "@/app/components/admin/AdminShell";
import AdminVendorsClient from "@/app/components/admin/AdminVendorsClient";

export default function AdminCommissionsPage() {
  return (
    <AdminShell
      title="العمولات"
      subtitle="نسبة عمولة المنصة لكل متجر (محرر مباشرة في صفحة المتاجر)"
    >
      <AdminVendorsClient />
    </AdminShell>
  );
}
