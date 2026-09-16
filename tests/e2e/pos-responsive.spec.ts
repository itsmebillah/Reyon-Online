import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/app/pos/pos.css", import.meta.url),
  "utf8",
);

const viewports = [320, 360, 375, 390, 414, 768, 1024, 1280] as const;

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

async function expectInsideViewport(page: Page, selector: string) {
  const bounds = await page.locator(selector).first().boundingBox();
  const viewport = page.viewportSize();
  expect(bounds, `${selector} should have a bounding box`).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(
    bounds!.x,
    `${selector} should not extend left`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    bounds!.x + bounds!.width,
    `${selector} should not extend right`,
  ).toBeLessThanOrEqual(viewport!.width + 1);
}

async function toggleClass(
  page: Page,
  selector: string,
  className: string,
  enabled: boolean,
) {
  await page
    .locator(selector)
    .evaluate(
      (element, value) =>
        element.classList.toggle(value.className, value.enabled),
      { className, enabled },
    );
}

for (const width of viewports) {
  test(`POS surfaces fit a ${width}px viewport`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Explicit widths run once in the desktop browser project.",
    );
    await page.setViewportSize({ width, height: width <= 414 ? 844 : 900 });
    await page.setContent(`
      <style>
        ${css}
        .fixture-hidden { display: none !important; }
        .fixture-wide-table { min-width: 760px; }
        .pos-sidebar { transition: none !important; }
      </style>
      <div class="pos-app">
        <button class="pos-mobile-menu" aria-label="Open POS menu">Menu</button>
        <aside class="pos-sidebar">
          <div class="pos-brand"><strong>REYON</strong></div>
          <div class="pos-location"><span>Extremely Long Store Location Name That Must Fit</span></div>
          <nav class="pos-nav"><a class="active">Sales POS</a><a>Suppliers & purchasing</a></nav>
          <div class="pos-sidebar__footer"><div class="pos-sidebar__identity"><strong>employee-with-a-long-email-address@example.com</strong><small>Secure Reyon session</small></div><form><button class="pos-sidebar-logout" aria-label="Logout"><span>Logout</span></button></form><button aria-label="Collapse sidebar">Collapse</button></div>
        </aside>
        <main class="pos-main">
          <div class="pos-page">
            <header class="pos-page-header">
              <div><h1>Sales POS</h1><p>Point of Sale Register & Invoice Checkout</p></div>
              <span class="pos-badge">Ready · Very Long Register Name</span>
            </header>
            <div class="pos-toolbar">
              <div class="pos-search"><input placeholder="Search by product, SKU, or barcode" /></div>
              <button class="pos-button"><span>Camera Scan</span></button>
            </div>
            <div class="pos-register-grid">
              <section class="pos-products">
                <button class="pos-product">
                  <div class="pos-product__image"><svg></svg></div>
                  <div class="pos-product__body">
                    <strong>Extraordinarily-long-unbroken-product-name-that-must-wrap</strong>
                    <small>Variant · SKU-WITH-A-VERY-LONG-IDENTIFIER-123456789</small>
                    <div class="pos-product__bottom"><span class="pos-product__price">৳123,456</span><span class="pos-stock">999 in stock</span></div>
                  </div>
                </button>
                <button class="pos-product"><div class="pos-product__body"><strong>Second product</strong></div></button>
              </section>
              <aside class="pos-cart">
                <header><strong>Current Order <span class="pos-badge">2</span></strong><button>Clear</button></header>
              </aside>
            </div>
            <section class="pos-panel pos-table-wrap" data-testid="table-wrap">
              <table class="pos-table fixture-wide-table"><tbody><tr><td>INV-EXTREMELY-LONG-000000000001</td><td>long-email-address-for-testing@example.com</td><td>Customer</td><td>Payment</td></tr></tbody></table>
            </section>
          </div>
        </main>
        <aside class="pos-cart pos-cart--mobile fixture-hidden" data-testid="mobile-cart">
          <header><strong>Current Order <span class="pos-badge">2</span></strong><button>Close</button></header>
          <div class="pos-cart__items">
            <div class="pos-cart-line">
              <div class="pos-cart-line__top"><div><strong>Extraordinarily-long-unbroken-product-name-that-must-wrap</strong><small>SKU-WITH-A-VERY-LONG-IDENTIFIER-123456789</small></div><button>×</button></div>
              <div class="pos-cart-line__bottom"><div class="pos-quantity"><button>−</button><span>99</span><button>+</button></div><b>৳123,456,789</b></div>
            </div>
          </div>
          <div class="pos-cart__summary"><span class="total">Total <b>৳123,456,789</b></span><button class="pos-button">Proceed to checkout</button></div>
        </aside>
        <div class="pos-modal-backdrop fixture-hidden" data-testid="checkout-backdrop">
          <section class="pos-checkout">
            <header class="pos-modal-header"><div><strong>Complete Sale</strong><small>Customer, discount and payment</small></div><button>×</button></header>
            <div class="pos-checkout__body">
              <section class="pos-section"><div class="pos-fields"><div class="pos-field"><label>Name</label><input /></div><div class="pos-field"><label>Email</label><input /></div></div></section>
              <section class="pos-section"><label class="pos-badge"><input type="checkbox" /> Split / multiple tender</label><div class="pos-tender-line"><select><option>Mobile payment</option></select><input placeholder="Amount" /><input placeholder="Transaction reference" /><button>×</button></div><div class="pos-quick-cash"><button>Exact ৳123,456</button><button>৳200,000</button></div></section>
              <div class="pos-checkout-total"><span class="grand">Total <b>৳123,456,789</b></span></div>
            </div>
            <footer class="pos-modal-actions"><button class="pos-button pos-button--ghost">Cancel</button><button class="pos-button">Complete sale</button></footer>
          </section>
        </div>
        <div class="pos-modal-backdrop fixture-hidden" data-testid="import-backdrop">
          <section class="pos-modal"><header><div><h2>Import products</h2><p>Long modal description that remains inside the available viewport width.</p></div><button>×</button></header><div class="pos-modal__body"><p><strong>Required CSV headers:</strong> name, sku, purchase_price, selling_price, extraordinarily_long_identifier_without_spaces</p><div class="pos-form-grid"><label class="pos-field">Brand<select><option>Brand</option></select></label><label class="pos-field">CSV file<input type="file" /></label></div></div><footer><button class="pos-button pos-button--ghost">Cancel</button><button class="pos-button">Import products</button></footer></section>
        </div>
        <div class="pos-modal-backdrop fixture-hidden" data-testid="receipt-backdrop">
          <section class="pos-receipt-dialog"><div class="pos-receipt"><dl><div><dt>Invoice</dt><dd>INV-EXTREMELY-LONG-000000000001</dd></div></dl><table><tbody><tr><td>Extraordinarily-long-unbroken-product-name</td><td>৳123,456</td></tr></tbody></table><div class="pos-receipt__totals"><span><span>Total</span><strong>৳123,456,789</strong></span></div></div></section>
        </div>
      </div>
    `);

    await expectNoPageOverflow(page);
    for (const selector of [
      ".pos-main",
      ".pos-page",
      ".pos-page-header",
      ".pos-toolbar",
      ".pos-products",
      ".pos-product",
      "[data-testid=table-wrap]",
    ])
      await expectInsideViewport(page, selector);

    if (width <= 1023) {
      await expect(page.locator(".pos-mobile-menu")).toBeVisible();
      await expect(page.locator(".pos-sidebar")).not.toBeInViewport();
      await toggleClass(page, ".pos-sidebar", "pos-sidebar--open", true);
      await expectInsideViewport(page, ".pos-sidebar");
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
      await toggleClass(page, ".pos-sidebar", "pos-sidebar--open", false);
      await toggleClass(
        page,
        "[data-testid=mobile-cart]",
        "fixture-hidden",
        false,
      );
      await expectInsideViewport(page, "[data-testid=mobile-cart]");
      await expectNoPageOverflow(page);
      await toggleClass(
        page,
        "[data-testid=mobile-cart]",
        "fixture-hidden",
        true,
      );
    } else {
      await expect(page.locator(".pos-mobile-menu")).toBeHidden();
      await expect(page.locator(".pos-sidebar")).toBeInViewport();
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    }

    for (const modal of [
      "checkout-backdrop",
      "import-backdrop",
      "receipt-backdrop",
    ]) {
      await toggleClass(
        page,
        `[data-testid=${modal}]`,
        "fixture-hidden",
        false,
      );
      await expectInsideViewport(page, `[data-testid=${modal}]`);
      await expectNoPageOverflow(page);
      await toggleClass(page, `[data-testid=${modal}]`, "fixture-hidden", true);
    }

    const tableOverflow = await page
      .getByTestId("table-wrap")
      .evaluate((element) => element.scrollWidth > element.clientWidth);
    if (width <= 768) expect(tableOverflow).toBe(true);
    await expectNoPageOverflow(page);
  });
}
