import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/currency";

describe("currency formatter", () => {
  it("formats agorot to ILS currency", () => {
    const value = formatPrice(12345);
    expect(value).toContain("₪");
    expect(value).toContain("123");
  });

  it("keeps two-decimal precision when needed", () => {
    const value = formatPrice(199);
    expect(value).toContain("1.99");
  });
});
