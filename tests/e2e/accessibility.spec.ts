import { test, expect } from "@playwright/test";
import { main } from "./helpers";

const LESSON = "/learn/t1-foundations/s01-ground-floor/l01-values-and-names";

test("a skip link is the first thing keyboard users reach", async ({ page }) => {
  await page.goto("/learn");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveText(/Skip to content/i);
  await focused.press("Enter");
  await expect(page).toHaveURL(/#main/);
});

test("a lesson has exactly one h1 and no skipped heading levels", async ({ page }) => {
  await page.goto(LESSON);
  await expect(main(page).locator("h1")).toHaveCount(1);

  const levels = await main(page).locator("h1, h2, h3, h4").evaluateAll((nodes) =>
    nodes.map((n) => Number(n.tagName[1])),
  );
  let previous = levels[0];
  for (const level of levels.slice(1)) {
    // A heading may go deeper by one at most; it may jump back out freely.
    expect(level - previous).toBeLessThanOrEqual(1);
    previous = level;
  }
});

test("editors and controls carry accessible names", async ({ page }) => {
  await page.goto(LESSON);
  const shell = main(page).getByTestId("exercise-package-summary");
  // The textarea fallback and CodeMirror share this label, correctly — it is
  // the same control. Wait for the upgrade so exactly one is present.
  await expect(shell.locator(".cm-content")).toBeVisible({ timeout: 60_000 });
  await expect(
    shell.getByRole("textbox", { name: /Python editor for/i }),
  ).toBeVisible();
  await expect(shell.getByRole("button", { name: /Run tests/i })).toBeVisible();
});

test("unknown routes render the 404 page rather than an error", async ({ page }) => {
  const response = await page.goto("/definitely-not-a-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /Nothing here/i })).toBeVisible();
});
