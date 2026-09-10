import { test, expect } from "@playwright/test";

test("search finds a lesson by body text, not just title", async ({ page }) => {
  await page.goto("/learn");
  const search = page.getByLabel("Search the curriculum");
  await search.click();
  // "unknown" appears in the NULL lesson's prose but in no lesson title.
  await search.fill("unknown");
  await expect(page.getByRole("link", { name: /NULL/i }).first()).toBeVisible({ timeout: 30_000 });
});

test("search finds a problem and links to it", async ({ page }) => {
  await page.goto("/learn");
  await page.getByLabel("Search the curriculum").click();
  await page.getByLabel("Search the curriculum").fill("summarise");
  const result = page.getByRole("link", { name: /Summarise a list of packages/i });
  await expect(result).toBeVisible({ timeout: 30_000 });
  await result.click();
  await expect(page).toHaveURL(/\/problems\/package-summary/);
});

test("search finds a lesson by the misconception it corrects", async ({ page }) => {
  await page.goto("/learn");
  // This phrasing appears only in a `misconceptions` entry.
  await page.getByLabel("Search the curriculum").click();
  await page.getByLabel("Search the curriculum").fill("just a list without duplicates");
  await expect(
    page.getByRole("link", { name: /Collections and what they cost/i }),
  ).toBeVisible({ timeout: 30_000 });
});

test("search reports no matches rather than showing everything", async ({ page }) => {
  await page.goto("/learn");
  await page.getByLabel("Search the curriculum").click();
  await page.getByLabel("Search the curriculum").fill("zzzznotathing");
  await expect(page.getByText("No matches.")).toBeVisible({ timeout: 30_000 });
});

test("the table of contents tracks the visible section", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/learn/t1-foundations/s01-ground-floor/l06-null-and-three-valued-logic");

  const toc = page.getByRole("navigation", { name: "On this page" });
  await expect(toc).toBeVisible();
  await expect(toc.getByRole("link", { name: /The NOT IN trap/i })).toBeVisible();

  await toc.getByRole("link", { name: /The NOT IN trap/i }).click();
  await expect(page).toHaveURL(/#the-not-in-trap/);
});

test("the problem bank filters by language and pattern", async ({ page }) => {
  await page.goto("/problems");
  const countLine = page.getByText(/of \d+ problems/);
  await expect(countLine).toBeVisible();

  await page.getByLabel("Language").selectOption("sql");
  await expect(page.getByRole("link", { name: /Every package that is not MIT/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Summarise a list of packages/i })).toHaveCount(0);
});

test("the search index is not shipped inside the page payload", async ({ page }) => {
  // It is ~250KB and grows with the curriculum; embedding it would put that
  // cost on every visitor of every page whether or not they ever search.
  let indexRequested = false;
  page.on("request", (req) => {
    if (req.url().includes("search-index.json")) indexRequested = true;
  });

  await page.goto("/learn");
  expect(indexRequested).toBe(false);

  await page.getByLabel("Search the curriculum").click();
  await expect.poll(() => indexRequested, { timeout: 30_000 }).toBe(true);
});
