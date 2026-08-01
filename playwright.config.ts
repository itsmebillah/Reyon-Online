import { defineConfig, devices } from "@playwright/test";

const testPort = process.env.REYON_TEST_PORT;
if (!testPort)
  throw new Error(
    "REYON_TEST_PORT must be assigned by the isolated E2E launcher.",
  );
const testOrigin = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: testOrigin,
    channel: "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"] } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
