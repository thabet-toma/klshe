import DriverShell from "../../../components/driver/DriverShell";
import DriverOrderDetails from "../../../components/driver/DriverOrderDetails";

export default async function DriverOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DriverShell>
      <DriverOrderDetails orderId={id} />
    </DriverShell>
  );
}
