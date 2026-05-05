import OrdersList from "../../components/storefront/OrdersList";

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-screen-md px-4 pt-2">
      <h1 className="text-xl font-extrabold">طلباتي</h1>
      <p className="text-sm text-neutral-500">جميع طلباتك السابقة والحالية</p>
      <OrdersList />
    </div>
  );
}
