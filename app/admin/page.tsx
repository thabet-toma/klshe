import AdminShell from "../components/admin/AdminShell";
import AdminDashboard from "../components/admin/AdminDashboard";
import AdminImpersonateDriverCard from "../components/admin/AdminImpersonateDriverCard";

export default function AdminHome() {
  return (
    <AdminShell title="مرحباً، يا مدير" subtitle="نظرة سريعة على أداء اليوم">
      <AdminDashboard />
      <AdminImpersonateDriverCard />
    </AdminShell>
  );
}
