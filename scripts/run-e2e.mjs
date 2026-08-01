import { spawn } from "node:child_process";
import net from "node:net";

const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on("error", reject);
  server.listen({ host: "127.0.0.1", port: 0 }, () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      reject(new Error("The OS did not provide an isolated TCP port."));
      return;
    }
    server.close((error) => (error ? reject(error) : resolve(address.port)));
  });
});

console.log(`REYON E2E environment: isolated loopback port ${port}`);

const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    String(port),
  ],
  {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

const origin = `http://127.0.0.1:${port}`;
let identityVerified = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(origin);
    const html = await response.text();
    if (response.ok && /<title>[^<]*REYON/.test(html)) {
      identityVerified = true;
      break;
    }
  } catch {
    // The isolated server is still starting.
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (!identityVerified) {
  server.kill();
  throw new Error(`REYON identity validation failed at ${origin}.`);
}
console.log(`REYON E2E identity verified at ${origin}`);

const child = spawn(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  {
    env: { ...process.env, REYON_TEST_PORT: String(port) },
    stdio: "inherit",
    windowsHide: true,
  },
);

child.on("error", (error) => console.error(error));

child.on("close", (code, signal) => {
  if (signal) console.error(`Playwright exited after signal ${signal}.`);
  server.kill();
  process.exit(code ?? 1);
});
