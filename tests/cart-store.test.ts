import { describe, expect, it } from "vitest";
import { useCart } from "@/lib/stores/cart-store";

const p1 = {
  id: "p1",
  name: "Apple",
  price: 1200,
  unit: "1kg",
  image: "https://example.com/p1.jpg",
  categoryId: "c1",
  vendorId: "v1",
};

const p2 = {
  id: "p2",
  name: "Milk",
  price: 900,
  unit: "1L",
  image: "https://example.com/p2.jpg",
  categoryId: "c1",
  vendorId: "v2",
};

describe("cart store", () => {
  it("adds products and computes count/subtotal", () => {
    useCart.getState().add(p1, 2);
    expect(useCart.getState().count()).toBe(2);
    expect(useCart.getState().subtotal()).toBe(2400);
  });

  it("prompts on cross-vendor add", () => {
    useCart.getState().add(p1, 1);
    useCart.getState().add(p2, 1);
    expect(useCart.getState().vendorSwitchPrompt).toBeTruthy();
  });

  it("clears vendor and items", () => {
    useCart.getState().add(p1, 1);
    useCart.getState().clear();
    expect(useCart.getState().items).toHaveLength(0);
    expect(useCart.getState().vendorId).toBeNull();
  });
});
