import VendorPayoutsClient from "../../components/vendor/VendorPayoutsClient";
import { VendorShell } from "../../components/vendor/VendorWorkspace";

export default function VendorPayoutsPage() {
  return (
    <VendorShell title="السحوبات والرصيد" subtitle="رصيدك الحالي وسجل طلبات السحب">
      <VendorPayoutsClient />
    </VendorShell>
  );
}
