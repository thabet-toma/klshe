import { VendorShell } from "@/app/components/vendor/VendorWorkspace";
import VendorInventoryClient from "@/app/components/vendor/VendorInventoryClient";

export default function VendorInventoryPage() {
  return (
    <VendorShell title="المخزون" subtitle="إدارة كميات وحدود المنتجات">
      <VendorInventoryClient />
    </VendorShell>
  );
}
