import { VendorShell } from "@/app/components/vendor/VendorWorkspace";
import VendorCustomersClient from "@/app/components/vendor/VendorCustomersClient";

export default function VendorCustomersPage() {
  return (
    <VendorShell title="حسابات الزبائن" subtitle="إدارة الزبائن خارج المنصة (دفتر ديون)">
      <VendorCustomersClient />
    </VendorShell>
  );
}
