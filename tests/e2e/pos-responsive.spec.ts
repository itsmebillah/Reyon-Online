import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/app/pos/pos.css", import.meta.url),
  "utf8",
);

test("POS shell and register remain usable at every configured viewport", async ({
  page,
}) => {
  await page.setContent(`
    <style>${css}</style>
    <div class="pos-app">
      <button class="pos-mobile-menu" aria-label="Open POS menu">Menu</button>
      <aside class="pos-sidebar">
        <div class="pos-brand"><strong>REYON</strong></div>
        <nav class="pos-nav"><a class="active">Sales POS</a><a>Products</a></nav>
      </aside>
      <main class="pos-main">
        <div class="pos-page">
          <header class="pos-page-header"><div><h1>Sales POS</h1><p>Register</p></div></header>
          <div class="pos-register-grid">
            <section class="pos-panel">
              <div class="pos-product-grid">
                <button class="pos-product-card"><strong>Test product</strong><span>In stock</span></button>
              </div>
            </section>
            <aside class="pos-cart"><header><strong>Current sale</strong></header></aside>
          </div>
        </div>
      </main>
    </div>
  `);

  const width = page.viewportSize()?.width ?? 1280;
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: "Sales POS" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Test product" }),
  ).toBeVisible();

  if (width <= 1023) {
    await expect(
      page.getByRole("button", { name: "Open POS menu" }),
    ).toBeVisible();
    await expect(page.locator(".pos-sidebar")).not.toBeInViewport();
    await expect(page.locator(".pos-cart")).toBeHidden();
  } else {
    await expect(
      page.getByRole("button", { name: "Open POS menu" }),
    ).toBeHidden();
    await expect(page.locator(".pos-sidebar")).toBeInViewport();
    await expect(page.locator(".pos-cart")).toBeVisible();
  }
});
