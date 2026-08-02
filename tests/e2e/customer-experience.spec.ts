import { expect, test, type Page } from "@playwright/test";

const routes = [
  "/",
  "/shop",
  "/categories",
  "/search?q=serum",
  "/about",
  "/contact",
  "/account",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
  "/admin/login",
  "/admin/access-denied",
  "/admin/brands",
  "/admin/categories",
  "/admin/products",
  "/admin/collections",
  "/robots.txt",
  "/sitemap.xml",
];

function monitor(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      failures.push(
        `console: ${message.text()} ${message.location().url}`.trim(),
      );
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

for (const route of routes) {
  test(`route ${route} renders without runtime or asset failures`, async ({
    page,
  }) => {
    const failures = monitor(page);
    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status(), route).toBe(200);
    expect(failures).toEqual([]);
  });
}

test("homepage images load successfully", async ({ page }) => {
  const failures = monitor(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(page).toHaveTitle(/REYON/);
  for (const image of await page.locator("img:visible").all())
    await image.scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        page.locator("img").evaluateAll((images) =>
          images
            .filter((image) => {
              if (getComputedStyle(image).display === "none") return false;
              return (
                !(image as HTMLImageElement).complete ||
                (image as HTMLImageElement).naturalWidth === 0
              );
            })
            .map((image) => (image as HTMLImageElement).currentSrc),
        ),
      { timeout: 10_000 },
    )
    .toEqual([]);
  expect(failures).toEqual([]);
});

test("unknown routes render the branded 404", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page has wandered" }),
  ).toBeVisible();
});

test("admin authentication is private and deny-by-default", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/admin", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("admin login form uses native required-field protection", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/admin/login", { waitUntil: "load" });
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByLabel("Email address")).toBeFocused();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(failures).toEqual([]);
});

test("navigation and search remain usable", async ({ page }) => {
  const failures = monitor(page);
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("link", { name: "Shop", exact: true }).click();
  await expect(page).toHaveURL(/\/shop/);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("What are you looking for?").fill("serum");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: /Results for/ }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

test("homepage communicates the approved brand positioning hierarchy", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/");
  await expect(
    page
      .locator("#main")
      .getByText(
        "REYON is a premium multi-brand beauty and personal care retailer, specializing in authentic Korean beauty.",
      ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "100% authentic products" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Authentic K-Beauty expertise" }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

test("customer catalog excludes hardcoded demonstration products", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.getByText("Renewal Barrier Serum")).toHaveCount(0);
  await expect(page.getByText("Velvet Cream Cleanser")).toHaveCount(0);
  await expect(page.getByText("Luminous Hydration Essence")).toHaveCount(0);
  await expect(page.getByText("Restorative Night Cream")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("header uses the appropriate responsive logo lockup", async ({ page }) => {
  const failures = monitor(page);
  await page.goto("/");
  const isMobile = (page.viewportSize()?.width ?? 0) <= 680;
  const wordmark = page.locator(".header-logo--wordmark");
  const seal = page.locator(".header-logo--seal");

  if (isMobile) {
    await expect(wordmark).toBeVisible();
    await expect(seal).toBeHidden();
  } else {
    await expect(seal).toBeVisible();
    await expect(wordmark).toBeHidden();
  }

  expect(failures).toEqual([]);
});

test("inner pages provide consistent back navigation", async ({ page }) => {
  const failures = monitor(page);
  await page.goto("/");
  await page.goto("/shop");
  const backButton = page.getByRole("button", { name: "Go back" });
  await expect(backButton).toBeVisible();
  await backButton.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Go back" })).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("product actions provide clear feedback", async ({ page }) => {
  const failures = monitor(page);
  await page.goto("/shop");
  const save = page.locator('button[aria-label^="Save "]').first();
  if (!(await save.count())) {
    await expect(
      page.getByRole("heading", { name: "No products in this collection" }),
    ).toBeVisible();
    expect(failures).toEqual([]);
    return;
  }
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  const quickView = page.getByRole("button", { name: "Quick view" }).first();
  if (await quickView.isVisible()) {
    await quickView.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close quick view" }).click();
  }
  await page.getByRole("button", { name: "Add" }).first().click();
  await expect(page.getByRole("status")).toContainText("added to your bag");
  expect(failures).toEqual([]);
});

test("catalog filters are URL-addressable and preserve deterministic sorting", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/shop");
  const categories = page.getByLabel("Category").locator("option");
  const hasOperationalCategories = (await categories.count()) > 1;
  if (hasOperationalCategories)
    await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByLabel("Sort").selectOption("price-asc");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(
    hasOperationalCategories ? /category=.+sort=price-asc/ : /sort=price-asc/,
  );
  const prices = await page.locator(".product-price strong").allTextContents();
  const numeric = prices.map((price) => Number(price.replace(/[^0-9.]/g, "")));
  expect(numeric).toEqual([...numeric].sort((a, b) => a - b));
  expect(failures).toEqual([]);
});

test("contact form is keyboard-operable and honest about backend state", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Test customer");
  await page.getByLabel("Email", { exact: true }).fill("customer@example.com");
  await page.getByLabel("Message").fill("I would like product guidance.");
  await page.getByRole("button", { name: "Save message" }).click();
  await expect(page.getByRole("status")).toContainText("Message saved");
  expect(failures).toEqual([]);
});
