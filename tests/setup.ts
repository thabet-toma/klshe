import { beforeEach } from "vitest";
import { useCart } from "@/lib/stores/cart-store";

beforeEach(() => {
  localStorage.clear();
  useCart.setState({
    items: [],
    vendorId: null,
    vendorSwitchPrompt: null,
    isOpen: false,
  });
});
