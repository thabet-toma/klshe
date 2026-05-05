import VendorProductsClient from "../../components/vendor/VendorProductsClient";
import { VendorShell } from "../../components/vendor/VendorWorkspace";

export default function VendorProductsPage() {
  return (
    <VendorShell
      title="المنتجات"
      subtitle="قائمة المنتجات التابعة لهذا المتجر"
    >
      <VendorProductsClient />
    </VendorShell>
  );
}
