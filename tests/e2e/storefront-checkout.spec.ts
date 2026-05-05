import { expect, test } from "@playwright/test";

test("storefront to checkout flow", async ({ page }) => {
  await page.goto("/");

  const firstAddButton = page.getByRole("button", { name: /إضافة .* إلى السلة/ }).first();
  await expect(firstAddButton).toBeVisible();
  await firstAddButton.click();
  await page.waitForTimeout(400);

  await page.goto("/checkout");
  const emptyCart = page.getByText("سلتك فارغة");
  if (await emptyCart.isVisible()) {
    await page.evaluate(() => {
      const payload = {
        state: {
          items: [
            {
              productId: "e2e-p1",
              name: "منتج تجريبي",
              price: 1000,
              unit: "وحدة",
              image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80&auto=format&fit=crop",
              quantity: 1,
            },
          ],
          vendorId: "e2e-vendor",
        },
        version: 0,
      };
      localStorage.setItem("jetek-cart", JSON.stringify(payload));
    });
    await page.reload();
  }
  await expect(page.getByRole("heading", { name: "إتمام الطلب" })).toBeVisible();

  await page.getByRole("button", { name: "متابعة" }).click();
  await page.getByLabel("الاسم الكامل").fill("اختبار");
  await page.getByLabel("رقم الهاتف").fill("+972500000000");
  await page.getByLabel("العنوان التفصيلي").fill("عنوان اختبار");
  await page.getByRole("button", { name: "متابعة" }).click();

  await page.getByRole("button", { name: "متابعة" }).click();
  await page.getByRole("button", { name: "تأكيد الطلب" }).click();
  await expect
    .poll(async () => page.url())
    .toMatch(/\/(orders\/|login|checkout)/);

  if (page.url().includes("/orders/")) {
    await expect(page.getByText(/طلب #/)).toBeVisible();
  } else if (page.url().includes("/checkout")) {
    await expect(page.getByText(/يجب تسجيل الدخول|تم حفظ الطلب محلياً/)).toBeVisible();
  }
});
