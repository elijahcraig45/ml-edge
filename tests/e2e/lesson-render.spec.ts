import { test, expect } from "@playwright/test";
import { main } from "./helpers";

const LESSON = "/learn/t1-foundations/s01-ground-floor/l01-values-and-names";

test.describe("lesson rendering", () => {
  test("the ladder links through to a lesson", async ({ page }) => {
    await page.goto("/learn");
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /Ground Floor/i }).first().click();
    await expect(page).toHaveURL(/s01-ground-floor/);
    await page.getByRole("link", { name: /Values, names/i }).first().click();
    await expect(page).toHaveURL(new RegExp("l01-values-and-names"));
  });

  test("prose, objectives and misconceptions render", async ({ page }) => {
    await page.goto(LESSON);
    await expect(
      main(page).getByRole("heading", { name: /Values, names, and what a program/i }),
    ).toBeVisible();
    await expect(main(page).getByText("By the end you can")).toBeVisible();
    await expect(main(page).getByText("Where people go wrong")).toBeVisible();
  });

  test("runnable code blocks become editors, not static snippets", async ({ page }) => {
    await page.goto(LESSON);
    // Every fence in this lesson is `runnable`, so it renders as an editable
    // scratchpad rather than as highlighted prose. Highlighting itself is
    // asserted in tests/unit/markdown.test.ts, where it can be checked exactly.
    await expect(main(page).getByText("Try it — Python").first()).toBeVisible();
    await expect(main(page).getByLabel("Scratchpad editor").first()).toBeVisible();
  });

  test("headings get anchors for the table of contents", async ({ page }) => {
    await page.goto(LESSON);
    const anchored = main(page).locator("h2 a.heading-anchor").first();
    await expect(anchored).toBeVisible();
  });

  test("an unpublished lesson 404s rather than 500ing", async ({ page }) => {
    const response = await page.goto(
      "/learn/t1-foundations/s01-ground-floor/l99-does-not-exist",
    );
    expect(response?.status()).toBe(404);
  });
});
