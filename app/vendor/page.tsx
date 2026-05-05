import VendorHomeClient from "../components/vendor/VendorHomeClient";
import { VendorShell } from "../components/vendor/VendorWorkspace";

export default function VendorDashboardPage() {
  return (
    <VendorShell
      title="لوحة المتجر"
      subtitle="مؤشرات سريعة وطلبات اليوم"
    >
      <VendorHomeClient />
    </VendorShell>
  );
}
