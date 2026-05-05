import VendorOrdersClient from "../../components/vendor/VendorOrdersClient";
import { VendorShell } from "../../components/vendor/VendorWorkspace";

export default function VendorOrdersPage() {
  return (
    <VendorShell
      title="طلبات العملاء"
      subtitle="الطلبات المرتبطة بمتجرك"
    >
      <VendorOrdersClient />
    </VendorShell>
  );
}
