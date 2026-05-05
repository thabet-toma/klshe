import AdminShell from "../components/admin/AdminShell";
import AdminDashboard from "../components/admin/AdminDashboard";

export default function AdminHome() {
  return (
    <AdminShell title="مرحباً، يا مدير" subtitle="نظرة سريعة على أداء اليوم">
      <AdminDashboard />
    </AdminShell>
  );
}
