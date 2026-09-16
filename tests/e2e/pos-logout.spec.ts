import { expect, test } from "@playwright/test";

test("authenticated POS employee can log out and cannot reopen POS", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Authentication is covered once",
  );

  const email = process.env.REYON_POS_EMPLOYEE_EMAIL;
  const password = process.env.REYON_POS_EMPLOYEE_PASSWORD;
  test.skip(
    !email || !password,
    "POS employee browser credentials are required",
  );

  await page.goto("/admin/login?next=/pos");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/pos(?:\/|$)/, { timeout: 15_000 });

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/admin\/login(?:\?|$)/, { timeout: 15_000 });

  await page.goto("/pos");
  await expect(page).toHaveURL(/\/admin\/login(?:\?|$)/, {
    timeout: 15_000,
  });
});
