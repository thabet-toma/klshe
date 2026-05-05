import VendorMenuCategoriesClient from "../../components/vendor/VendorMenuCategoriesClient";
import { VendorShell } from "../../components/vendor/VendorWorkspace";

export default function VendorMenuCategoriesPage() {
  return (
    <VendorShell
      title="فئات قائمة الطعام"
      subtitle="التبويبات داخل صفحة المتجر (وجبات، مشروبات…)"
    >
      <VendorMenuCategoriesClient />
    </VendorShell>
  );
}
