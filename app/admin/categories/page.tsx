import AdminShell from "@/app/components/admin/AdminShell";
import CategoriesAdminClient from "./CategoriesAdminClient";

export default function AdminCategoriesPage() {
  return (
    <AdminShell
      title="التصنيفات"
      subtitle="تعديل أقسام المتجر الظاهرة في واجهة الزبائن"
    >
      <CategoriesAdminClient />
    </AdminShell>
  );
}
