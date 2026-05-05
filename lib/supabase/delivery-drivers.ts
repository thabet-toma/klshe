import type { Driver } from "@/lib/types";
import { drivers as mockDrivers } from "@/lib/mock";
import { createServerSupabase, isSupabaseServerConfigured } from "./server";

type Row = {
  id: string;
  name: string;
  phone: string;
  avatar_url: string;
  vehicle: string;
  rating: string | number | null;
  status: "online" | "busy" | "offline";
  today_orders: number | null;
  earnings_today: string | number | null;
};

export function mapDeliveryDriverRow(row: Row): Driver {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    avatar: row.avatar_url,
    vehicle: row.vehicle,
    rating: Number(row.rating ?? 0),
    status: row.status,
    todayOrders: row.today_orders ?? 0,
    earningsToday: Number(row.earnings_today ?? 0),
  };
}

/** قائمة السائقين للتوزيع ولوحة الإدارة — Supabase أو بيانات العرض (mock). */
export async function listDeliveryDrivers(): Promise<Driver[]> {
  if (!isSupabaseServerConfigured) {
    return mockDrivers;
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("delivery_drivers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return mockDrivers;
    }
    if (!data?.length) {
      return mockDrivers;
    }
    return data.map((r) => mapDeliveryDriverRow(r as Row));
  } catch {
    return mockDrivers;
  }
}

/** لوحة الإدارة: يعرض حالة الجدول الفعلية (بدون العودة للـ mock عند الفراغ). */
export async function listDeliveryDriversForAdmin(): Promise<Driver[]> {
  if (!isSupabaseServerConfigured) {
    return mockDrivers;
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("delivery_drivers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return [];
    }
    return (data ?? []).map((r) => mapDeliveryDriverRow(r as Row));
  } catch {
    return [];
  }
}
