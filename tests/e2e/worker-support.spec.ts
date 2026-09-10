import { test, expect } from "@playwright/test";

/** Proves the bundler resolves `new Worker(new URL(...), { type: "module" })`.
 *  Both code runners depend on this: Pyodide must run off the main thread so a
 *  learner's infinite loop can be killed with worker.terminate(). If this breaks,
 *  every exercise breaks, so it is worth one dedicated test. */
test("module workers are bundled and can round-trip a message", async ({ page }) => {
  await page.goto("/worker-check");
  await expect(page.getByTestId("worker-status")).toHaveText("ok:4", { timeout: 20_000 });
});
