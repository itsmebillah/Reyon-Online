import { expect, test, type Page } from "@playwright/test";

function monitor(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`response: ${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED")
      failures.push(
        `network: ${request.url()} ${request.failure()?.errorText}`,
      );
  });
  return failures;
}

async function expectBelowStickyHeader(page: Page, selector: string) {
  if ((page.viewportSize()?.width ?? 1280) > 720) return;
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, selector.slice(1));
  await page.waitForTimeout(250);
  const header = await page.locator(".site-header").boundingBox();
  const section = await page.locator(selector).boundingBox();
  expect(header).not.toBeNull();
  expect(section).not.toBeNull();
  expect(section!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
}

test("customer can browse, add to cart, preserve address, and reach configured checkout steps", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/shop");
  const productLink = page.locator(".product-card h3 a").first();
  const productName = await productLink.innerText();
  await productLink.click();
  await expect(page).toHaveURL(/\/products\//);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.locator(".product-gallery img")).toHaveAttribute(
    "src",
    /.+/,
  );
  await page.getByRole("button", { name: /^Add/ }).first().click();
  await expect(page.getByRole("status")).toContainText(/added to your bag/i);
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Shopping bag" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel("Full name").fill("REYON Browser Test");
  await page.getByLabel("Phone").fill("01000000000");
  await page.getByLabel("House No").fill("QA-1");
  await page.getByLabel("Road").fill("Stabilization Road");
  await page.getByLabel("Village / City").fill("Dhaka");
  await page.getByLabel("Thana / Upazila").fill("Dhaka");
  await page.getByLabel("District").fill("Dhaka");
  await page.getByLabel("Division").fill("Dhaka");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("status")).toContainText(
    "address saved securely",
  );
  await expect(page.getByLabel("Full name")).toHaveValue("REYON Browser Test");

  const zoneOptions = page.locator('#delivery-zone input[name="deliveryZone"]');
  await expect(
    page.getByRole("button", { name: /save delivery zone/i }),
  ).toHaveCount(0);
  await expectBelowStickyHeader(page, "#delivery-zone");
  if (await zoneOptions.count()) {
    await zoneOptions.first().check();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(
      page.locator("#delivery-zone").getByRole("status"),
    ).toContainText(/delivery option confirmed/i);
    await page
      .locator("#payment-method label", { hasText: "Card" })
      .locator("input")
      .check();
    const continueButton = page.getByRole("button", {
      name: "Continue to payment",
    });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await expect(page.locator("#payment-confirmation")).toBeVisible();
    await expectBelowStickyHeader(page, "#payment-confirmation");
    await expect(page.getByText("No card number, PIN, CVV")).toBeVisible();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(
      page.locator("#payment-method").getByRole("status"),
    ).toContainText("Payment method saved");
    await expectBelowStickyHeader(page, "#order-confirmation");
    await page.getByRole("button", { name: "Change method" }).click();
    await page
      .locator("#payment-method label", { hasText: "Cash on Delivery" })
      .locator("input")
      .check();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(
      page.getByText("Cash on Delivery will remain payable"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(
      page.locator("#payment-method").getByRole("status"),
    ).toContainText("Payment method saved");
    await page.reload();
    await expect(page.locator("#payment-confirmation")).toContainText(
      "Cash on Delivery",
    );
    const confirmOrder = page.getByRole("button", { name: "Confirm order" });
    await expect(confirmOrder).toBeEnabled();
    await confirmOrder.click();
    await expect(
      page.getByText(/This checkout has already created order/),
    ).toBeVisible();
  } else {
    await expect(
      page.getByText("Delivery is not configured yet"),
    ).toBeVisible();
  }
  expect(failures).toEqual([]);
});

test("authenticated administrator can traverse every released workspace module", async ({
  page,
}) => {
  const email = process.env.REYON_ADMIN_EMAIL;
  const password = process.env.REYON_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "Administrator browser credentials are required",
  );
  const failures = monitor(page);
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Your business workspace" }),
  ).toBeVisible();

  const modules = [
    ["brands", "Brand Management"],
    ["categories", "Category Management"],
    ["products", "Product Management"],
    ["media", "Product Media"],
    ["collections", "Homepage Collections"],
    ["orders", "Order Management"],
    ["orders/reviews", "Cancellation & Review Queue"],
    ["orders/changes", "Correction & Return Boundaries"],
    ["notifications", "Notification Outbox"],
    ["inventory", "Inventory Entry"],
    ["delivery", "Delivery zones & charges"],
    ["payments", "Payment methods"],
  ] as const;
  for (const [path, heading] of modules) {
    await page.goto(`/admin/${path}`);
    await expect(
      page.getByRole("heading", { name: heading, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  }

  await page.goto("/admin/brands");
  const brandEditor = page.locator("details.brand-editor").first();
  await brandEditor.locator(":scope > summary").click();
  await expect(brandEditor.locator('input[name="name"]')).not.toHaveValue("");
  await expect(
    brandEditor.getByRole("button", { name: "Save brand" }),
  ).toBeVisible();

  await page.goto("/admin/categories");
  const categoryEditor = page.locator("details.brand-editor").first();
  await categoryEditor.locator(":scope > summary").click();
  await expect(categoryEditor.locator('input[name="name"]')).not.toHaveValue(
    "",
  );

  await page.goto("/admin/products?q=logos");
  await expect(page.getByText("logos", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".status-pill").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose from Media Library" }),
  ).toBeVisible();

  await page.goto("/admin/media");
  const gallery = page.locator("details.product-media-product").first();
  await gallery.locator(":scope > summary").click();
  await expect(
    gallery.getByRole("heading", { name: "Current gallery" }),
  ).toBeVisible();
  await expect(gallery.locator("img").first()).toBeVisible();

  await page.goto("/admin/inventory");
  expect(
    await page.locator('select[name="variantId"] option').count(),
  ).toBeGreaterThan(1);
  expect(
    await page.locator('select[name="locationId"] option').count(),
  ).toBeGreaterThan(0);
  await page
    .locator('select[name="movementType"]')
    .selectOption("adjustment-in");
  await page.locator('input[name="quantity"]').fill("1");

  await page.goto("/admin/orders");
  const orderReferences = page.locator(
    ".order-table tbody tr td:first-child strong",
  );
  if (await orderReferences.count()) {
    await expect(orderReferences.first()).toHaveText(/^RYN-\d{4}-\d{6}$/);
    const reference = await orderReferences.first().innerText();
    await orderReferences.first().getByRole("link").click();
    await expect(page.getByRole("heading", { name: reference })).toBeVisible();
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Advance or resolve" }),
    ).toBeVisible();
  }

  await page.goto("/admin/orders/reviews");
  await expect(
    page.getByRole("button", { name: "Process expired reservations" }),
  ).toBeVisible();

  await page.goto("/admin/delivery");
  for (const card of await page.locator(".admin-module-card").all()) {
    if (await card.locator('input[name="isEnabled"]').isChecked())
      await expect(card.locator('input[name="charge"]')).not.toHaveValue("");
  }

  await page.goto("/admin/payments");
  await expect(
    page.getByRole("heading", { name: "Pending payment evidence" }),
  ).toBeVisible();
  const cardMethod = page.locator(".admin-module-card", { hasText: "Card" });
  await expect(cardMethod.locator('input[name="selectable"]')).toBeChecked();

  await page.goto("/admin/products");
  await page
    .locator('.catalog-product-form input[name="name"]')
    .fill("Unsaved navigation check");
  page.once("dialog", async (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/admin\/products/);
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect(failures).toEqual([]);
});

test("mobile customer navigation and cart controls remain usable", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "mobile",
    "Mobile-only stabilization workflow",
  );
  const failures = monitor(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in / Account" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Shop" }).first().click();
  await expect(page).toHaveURL(/\/shop/);
  await page.getByRole("button", { name: /^Add/ }).first().click();
  await expect(page.getByRole("status")).toContainText(/added to your bag/i);
  const cart = page.getByRole("link", { name: /Shopping bag with 1 items/i });
  await expect(cart).toBeVisible();
  await cart.click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(
    page.getByRole("link", { name: "Continue to checkout" }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});
