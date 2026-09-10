import { defineConfig, devices } from "@playwright/test";

const PROD_URL = "https://mledge-338436483735.us-central1.run.app";

/** Set PLAYWRIGHT_BASE_URL to test an already-running server (or a deployed one).
 *  Left unset, we build and boot the app locally so `e2e` is a pre-merge gate. */
/** Deliberately not 3000: other projects on this machine squat that port, and
 *  `reuseExistingServer` would silently run the suite against the wrong app. */
const TEST_PORT = 3111;
const localBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${TEST_PORT}`;
const usingExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  timeout: 60_000,
  // Serial on purpose. Each worker downloads and boots its own Pyodide and
  // DuckDB — tens of megabytes and several seconds apiece — and running them
  // concurrently starves the boots badly enough to produce timeout flakes that
  // look exactly like real failures. A deterministic two-minute suite is worth
  // more as a merge gate than a flaky one-minute suite.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { trace: "on-first-retry" },
  webServer: usingExternalServer
    ? undefined
    : {
        command: `npm run build && bash scripts/serve-standalone.sh ${TEST_PORT}`,
        url: localBaseURL,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: "chromium",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: localBaseURL },
    },
    {
      // Post-deploy check against production. Not a pre-merge gate.
      name: "prod-smoke",
      testDir: "./tests/smoke",
      use: { ...devices["Desktop Chrome"], baseURL: PROD_URL },
    },
  ],
});
