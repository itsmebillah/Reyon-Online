import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { database, seedWatch } from "../tests/helpers/database.mjs";
const db = await database();
await seedWatch(db);
await db.exec("set role anon");
const allowed = new Set([
  "watch_catalog",
  "watch_categories",
  "watch_brands",
  "watch_sitemap",
  "cart_summary",
  "watch_cart_add_item",
  "cart_set_quantity",
  "checkout_address",
  "checkout_order_state",
  "checkout_payment_methods",
  "delivery_zones",
  "checkout_save_watch_address",
  "checkout_select_payment",
  "checkout_confirm_order",
  "checkout_order_success",
]);
const server = createServer(async (req, res) => {
  const name = new URL(req.url, "http://localhost").pathname.split("/").pop();
  if (!allowed.has(name)) {
    res.writeHead(404);
    res.end("{}");
    return;
  }
  try {
    let body = "";
    for await (const part of req) {
      body += part;
      if (body.length > 100000) throw new Error("Large request");
    }
    const args = Object.entries(JSON.parse(body || "{}"));
    if (args.some(([k]) => !/^p_[a-z_]+$/.test(k)))
      throw new Error("Invalid argument");
    const sql =
      "select * from public." +
      name +
      "(" +
      args.map(([k], i) => k + " => $" + (i + 1)).join(",") +
      ")";
    const rows = (
      await db.query(
        sql,
        args.map(([, v]) => v),
      )
    ).rows;
    const output = ["checkout_payment_methods", "delivery_zones"].includes(name)
      ? rows
      : (rows[0]?.[name] ?? null);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(output));
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: e.message }));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const fixturePort = server.address().port;
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:" + fixturePort,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-fixture-key",
  REYON_E2E_BROWSER_CHANNEL: process.env.REYON_E2E_BROWSER_CHANNEL ?? "bundled",
  REYON_FIXTURE_E2E: "true",
};
const run = (args) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, args, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    p.on("close", (code) => resolve(code ?? 1));
    p.on("error", () => resolve(1));
  });
let code = 1;
try {
  code = await run(["node_modules/next/dist/bin/next", "build"]);
  if (code === 0)
    code = await run(["scripts/run-e2e.mjs", ...process.argv.slice(2)]);
} finally {
  server.close();
  await db.close();
}
process.exitCode = code;
