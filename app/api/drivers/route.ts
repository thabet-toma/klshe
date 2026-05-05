import { NextResponse } from "next/server";
import { listDeliveryDrivers } from "@/lib/supabase/delivery-drivers";

export async function GET() {
  const drivers = await listDeliveryDrivers();
  return NextResponse.json({ drivers });
}
