import AdminShell from "@/app/components/admin/AdminShell";
import AdminOnboardingClient from "@/app/components/admin/AdminOnboardingClient";

export default function AdminOnboardingPage() {
  return (
    <AdminShell title="طلبات الانضمام" subtitle="مراجعة طلبات البائعين والسائقين">
      <AdminOnboardingClient />
    </AdminShell>
  );
}
