import { VendorShell } from "@/app/components/vendor/VendorWorkspace";
import VendorSalesInvoicesClient from "@/app/components/vendor/VendorSalesInvoicesClient";

export default function VendorSalesInvoicesPage() {
  return (
    <VendorShell title="فواتير البيع" subtitle="فواتير بيع يدوية للزبائن خارج المنصة">
      <VendorSalesInvoicesClient />
    </VendorShell>
  );
}
