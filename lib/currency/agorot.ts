/**
 * تحويل قيمة من شيكل (decimal) إلى أغورة (int).
 * مثال: 25.9 => 2590
 */
export function shekelToAgorot(value: number): number {
  return Math.round(value * 100);
}

/**
 * ضمان أن القيمة المرسلة أغورة صحيحة (int >= 0).
 * تُستخدم مع totals القادمة من الواجهة.
 */
export function normalizeAgorot(value: number): number {
  return Math.max(0, Math.round(value));
}

export function agorotToShekel(value: number): number {
  return value / 100;
}
