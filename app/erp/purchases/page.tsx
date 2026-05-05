import { redirect } from "next/navigation";

export default function ErpPurchasesRedirect() {
  redirect("/vendor/purchase-invoices");
}
