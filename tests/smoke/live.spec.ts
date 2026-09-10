import { test, expect } from "@playwright/test";

/**
 * Post-deploy smoke tests. `baseURL` comes from the `prod-smoke` project, so
 * these run against production and are NOT a pre-merge gate — the real suite
 * lives in tests/e2e and runs against a locally built server.
 */

test("the front door redirects to the curriculum", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the ladder lists published stages", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Stage 1/i }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("a lesson renders with runnable content", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("link", { name: /Ground Floor/i }).first().click();
  await page.getByRole("link", { name: /Values, names/i }).first().click();
  await expect(page.getByText("By the end you can")).toBeVisible();
  await expect(page.getByText(/Try it — Python/).first()).toBeVisible();
});

test("the problem bank loads and filters", async ({ page }) => {
  await page.goto("/problems");
  await expect(page.getByText(/of \d+ problems/)).toBeVisible();
  await expect(page.getByLabel("Pattern")).toBeVisible();
});

test("interview mode offers a session", async ({ page }) => {
  await page.goto("/interview");
  await expect(page.getByRole("button", { name: /Start a session/i })).toBeVisible();
});

test("sitemap and robots are served", async ({ page }) => {
  const sitemap = await page.goto("/sitemap.xml");
  expect(sitemap?.status()).toBe(200);
  const robots = await page.goto("/robots.txt");
  expect(robots?.status()).toBe(200);
});

test("retired routes redirect rather than 404", async ({ page }) => {
  await page.goto("/curriculum");
  await expect(page).toHaveURL(/\/learn/);
});
