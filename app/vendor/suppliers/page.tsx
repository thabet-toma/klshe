import { VendorShell } from "@/app/components/vendor/VendorWorkspace";
import VendorSuppliersClient from "@/app/components/vendor/VendorSuppliersClient";

export default function VendorSuppliersPage() {
  return (
    <VendorShell title="الموردون" subtitle="إدارة قائمة موردي البضائع">
      <VendorSuppliersClient />
    </VendorShell>
  );
}
