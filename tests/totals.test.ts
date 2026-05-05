import { describe, expect, it } from "vitest";

function calcTotal(subtotal: number, deliveryFee: number, discountAmount = 0) {
  return subtotal + deliveryFee - discountAmount;
}

describe("totals math", () => {
  it("adds subtotal + delivery fee", () => {
    expect(calcTotal(10000, 2000)).toBe(12000);
  });

  it("applies discount and never mutates inputs", () => {
    const subtotal = 15000;
    const delivery = 2500;
    const discount = 1000;
    expect(calcTotal(subtotal, delivery, discount)).toBe(16500);
    expect(subtotal).toBe(15000);
  });
});
