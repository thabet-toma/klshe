import AdminShell from "../../components/admin/AdminShell";
import AdminCustomersClient from "./AdminCustomersClient";

export default function AdminCustomersPage() {
  return (
    <AdminShell title="العملاء" subtitle="عرض جميع زبائن المنصة">
      <AdminCustomersClient />
    </AdminShell>
  );
}
