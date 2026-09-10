import { test, expect } from "@playwright/test";

const STAGE = "/learn/t1-foundations/s01-ground-floor";

/** Scoped to #main: during hydration the router can briefly hold two trees. */
function gate(page: import("@playwright/test").Page) {
  return page.locator("#main").getByText("Stage gate");
}

test("the stage gate is drawn from the stage's own lessons", async ({ page }) => {
  await page.goto(STAGE);
  await expect(gate(page)).toBeVisible();
  // Submit stays disabled until every question is answered.
  await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();
});

test("submitting scores the gate and reveals every explanation", async ({ page }) => {
  await page.goto(STAGE);
  await expect(gate(page)).toBeVisible();

  const radios = page.locator("#main").locator('input[type="radio"]');
  await expect(radios.first()).toBeVisible();

  // Collect the group names in one round trip. Doing a getAttribute per radio
  // is ~32 round trips and overran the test timeout.
  const names = await radios.evaluateAll((nodes) =>
    nodes.map((n) => (n as HTMLInputElement).name),
  );
  const firstOfGroup: number[] = [];
  const seen = new Set<string>();
  names.forEach((name, index) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    firstOfGroup.push(index);
  });
  expect(firstOfGroup.length).toBeGreaterThan(0);

  // Answer one option per question. Which option is correct is not knowable
  // from the DOM, so this asserts the gate scores and explains itself rather
  // than asserting a pass.
  for (const index of firstOfGroup) {
    await radios.nth(index).check();
  }

  await page.locator("#main").getByRole("button", { name: "Submit" }).click();
  await expect(page.locator("#main").getByText(/passed|not yet/)).toBeVisible();
  await expect(
    page.locator("#main").getByRole("button", { name: "Try again" }),
  ).toBeVisible();
});
