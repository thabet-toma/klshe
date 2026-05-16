export const ORDER_STATUSES = [
  "new",
  "broadcast",
  "accepted",
  "preparing",
  "ready",
  "dispatched",
  "on_way",
  "delivered",
  "cancelled",
  "rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  broadcast: "مُبثوث",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز",
  dispatched: "بانتظار الاستلام",
  on_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

export const statusStyles: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-700 ring-blue-200",
  broadcast: "bg-sky-100 text-sky-700 ring-sky-200",
  accepted: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  preparing: "bg-amber-100 text-amber-700 ring-amber-200",
  ready: "bg-teal-100 text-teal-700 ring-teal-200",
  dispatched: "bg-violet-100 text-violet-700 ring-violet-200",
  on_way: "bg-orange-100 text-orange-700 ring-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 ring-rose-200",
  rejected: "bg-gray-100 text-gray-700 ring-gray-200",
};

// وصول آمن بحالة نصّية غير مضمونة النوع (يرجع الحالة الخام إن لم تُعرَف)
export function statusLabel(status: string): string {
  return statusLabels[status as OrderStatus] ?? status;
}

export function statusStyle(status: string): string {
  return statusStyles[status as OrderStatus] ?? statusStyles.new;
}
