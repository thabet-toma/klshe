import OrderTrackingView from "../../../components/storefront/OrderTrackingView";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderTrackingView orderId={id} />;
}
