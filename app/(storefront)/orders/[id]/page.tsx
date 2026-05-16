import OrderTrackingView from "../../../components/storefront/OrderTrackingView";
import PaymentConfirmation from "../../../components/storefront/PaymentConfirmation";

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (sp.paid === "1") {
    return <PaymentConfirmation orderId={id} />;
  }
  return <OrderTrackingView orderId={id} />;
}
