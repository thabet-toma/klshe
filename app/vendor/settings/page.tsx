import VendorSettingsClient from "../../components/vendor/VendorSettingsClient";
import { VendorShell } from "../../components/vendor/VendorWorkspace";

export default function VendorSettingsPage() {
  return (
    <VendorShell title="إعدادات المتجر" subtitle="إدارة الشعار، البانر، وساعات العمل">
      <VendorSettingsClient />
    </VendorShell>
  );
}
