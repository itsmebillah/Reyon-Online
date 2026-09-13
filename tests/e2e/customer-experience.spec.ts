import { test, expect } from "@playwright/test";
test("watch storefront is responsive and contains no cosmetics copy", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Time, on your terms." }),
  ).toBeVisible();
  await expect(page.getByText("Test Everyday Watch").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /beauty|cosmetics|skincare|ritual/i,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: test.info().outputPath("watch-home.png"),
    fullPage: true,
  });
});
test("filters, variant selection and COD checkout persist a real test order", async ({
  page,
}) => {
  await page.goto("/shop");
  await page.getByLabel("Minimum ৳").fill("2600");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No watches found" }),
  ).toBeVisible();
  await page.goto("/products/test-everyday-watch");
  await expect(
    page.getByRole("heading", { name: "Test Everyday Watch" }),
  ).toBeVisible();
  await expect(page.getByLabel("Watch variant")).toBeVisible();
  expect(
    await page.locator('script[type="application/ld+json"]').textContent(),
  ).toContain("BDT");
  await page.getByRole("button", { name: "Buy now" }).click();
  await page.waitForURL("**/checkout");
  await page.getByLabel("Full name").fill("Test Buyer");
  await page.getByLabel("Mobile number").fill("01712345678");
  await page.getByLabel("District", { exact: true }).selectOption("Dhaka");
  await page.getByLabel("Area / Thana / Upazila").fill("Dhanmondi");
  await page.getByLabel("Full delivery address").fill("Test house, Test road");
  await page
    .getByRole("button", { name: "Save address & see delivery charge" })
    .click();
  await expect(page.getByRole("heading", { name: /Payment/ })).toBeVisible();
  await page.getByRole("button", { name: "Save payment method" }).click();
  await page
    .getByRole("button", { name: "Confirm order", exact: true })
    .click();
  await page.waitForURL("**/checkout/success");
  await expect(
    page.getByRole("heading", {
      name: "Your order has been placed successfully.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("watch-checkout.png"),
    fullPage: true,
  });
});
test("public information, metadata and admin denial work", async ({ page }) => {
  for (const path of [
    "/about",
    "/contact",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
    "/account",
  ]) {
    const r = await page.goto(path);
    expect(r?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText(
      /beauty|cosmetics|skincare|ritual/i,
    );
  }
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/admin\/login$/);
  await expect(page.getByLabel("Email address")).toBeVisible();
});
