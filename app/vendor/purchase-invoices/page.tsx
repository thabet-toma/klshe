import { VendorShell } from "@/app/components/vendor/VendorWorkspace";
import VendorPurchaseInvoicesClient from "@/app/components/vendor/VendorPurchaseInvoicesClient";

export default function VendorPurchaseInvoicesPage() {
  return (
    <VendorShell title="فواتير الشراء" subtitle="فواتير شراء يدوية مرتبطة بالمخزون">
      <VendorPurchaseInvoicesClient />
    </VendorShell>
  );
}
