import AdminShell from "@/app/components/admin/AdminShell";
import DriversAdminClient from "./DriversAdminClient";

export default function AdminDriversPage() {
  return (
    <AdminShell
      title="السائقون"
      subtitle="إضافة وتعديل وحذف السائقين — التعيين على الطلبات من صفحة الطلبات"
    >
      <DriversAdminClient />
    </AdminShell>
  );
}
