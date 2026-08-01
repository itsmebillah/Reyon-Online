import { expect, test, type Page } from "@playwright/test";

const routes = [
  "/",
  "/shop",
  "/categories",
  "/products/renewal-serum",
  "/products/velvet-cleanser",
  "/products/luminous-essence",
  "/products/restorative-cream",
  "/search?q=serum",
  "/about",
  "/contact",
  "/account",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
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

test("every route renders without runtime or asset failures", async ({
  page,
}) => {
  const failures = monitor(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/REYON/);
  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBe(
      route.includes("does-not-exist") ? 404 : 200,
    );
  }
  await page.goto("/", { waitUntil: "networkidle" });
  for (const image of await page.locator("img").all())
    await image.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  const brokenImages = await page
    .locator("img")
    .evaluateAll((images) =>
      images
        .filter(
          (image) =>
            !(image as HTMLImageElement).complete ||
            (image as HTMLImageElement).naturalWidth === 0,
        )
        .map((image) => (image as HTMLImageElement).currentSrc),
    );
  expect(brokenImages).toEqual([]);
  expect(failures).toEqual([]);
});

test("unknown routes render the branded 404", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page has wandered" }),
  ).toBeVisible();
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
  const save = page
    .locator('button[aria-label*="Renewal Barrier Serum"]')
    .first();
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
