import AdminShell from "../../components/admin/AdminShell";
import ProductsAdminClient from "../../components/admin/ProductsAdminClient";

export default function AdminProductsPage() {
  return (
    <AdminShell
      title="المنتجات"
      subtitle="إدارة كاملة من Supabase — أو معاينة محلية بدون مفاتيح"
    >
      <ProductsAdminClient />
    </AdminShell>
  );
}
