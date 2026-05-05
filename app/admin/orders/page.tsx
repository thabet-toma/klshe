import AdminShell from "../../components/admin/AdminShell";
import OrdersBoard from "../../components/admin/OrdersBoard";

export default function AdminOrdersPage() {
  return (
    <AdminShell title="إدارة الطلبات" subtitle="استقبل، عيّن، وتابع الطلبات">
      <OrdersBoard />
    </AdminShell>
  );
}
