import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/lib/schemas/orders";

describe("orders schema", () => {
  it("accepts valid order payload", () => {
    const parsed = createOrderSchema.safeParse({
      customerName: "User",
      customerPhone: "+972500000000",
      customerAddress: "Address",
      subtotal: 1000,
      deliveryFee: 500,
      discountAmount: 0,
      total: 1500,
      paymentMethod: "cash",
      items: [
        {
          productId: "p1",
          name: "Apple",
          price: 1000,
          unit: "1kg",
          image: "https://example.com/a.jpg",
          quantity: 1,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty items", () => {
    const parsed = createOrderSchema.safeParse({
      customerName: "User",
      customerPhone: "+972500000000",
      customerAddress: "Address",
      subtotal: 1000,
      deliveryFee: 500,
      total: 1500,
      paymentMethod: "cash",
      items: [],
    });
    expect(parsed.success).toBe(false);
  });
});
