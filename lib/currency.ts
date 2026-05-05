/**
 * المبالغ تُخزَّن كأرقام صحيحة بالأغورة (1/100 شيكل) لتفادي أخطاء الفاصلة العشرية.
 */
export function formatPrice(agorot: number): string {
  const ils = agorot / 100;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(ils);
}

/** للتسميات النصية عند الحاجة (الرمز يظهر تلقائياً مع formatPrice) */
export const CURRENCY_NAME_AR = "شيكل";
