import { test, expect } from "@playwright/test";
import { main } from "./helpers";

const L02 = "/learn/t1-foundations/s01-ground-floor/l02-collections-and-their-costs";
const L03 = "/learn/t1-foundations/s01-ground-floor/l03-counting-operations";
const L01 = "/learn/t1-foundations/s01-ground-floor/l01-values-and-names";

test("the interview pass reveals interview-only content", async ({ page }) => {
  await page.goto(L02);

  // The spine is always present.
  await expect(main(page).getByRole("heading", { name: /accidentally quadratic/i })).toBeVisible();
  // The interview block is not, until the path is chosen.
  await expect(main(page).getByRole("heading", { name: /Recognising this in an interview/i })).toHaveCount(0);

  await main(page).getByRole("button", { name: "Interview" }).click();
  await expect(main(page).getByRole("heading", { name: /Recognising this in an interview/i })).toBeVisible();
  // Choosing a pass adds content; it never hides the spine.
  await expect(main(page).getByRole("heading", { name: /accidentally quadratic/i })).toBeVisible();
});

test("the chosen path persists across lessons", async ({ page }) => {
  await page.goto(L02);
  await main(page).getByRole("button", { name: "Interview" }).click();
  await expect(main(page).getByRole("heading", { name: /Recognising this in an interview/i })).toBeVisible();

  // A different lesson, whose extra pass is a proof rather than an interview
  // section, should not show it while the interview path is selected.
  await page.goto(L03);
  await expect(main(page).getByRole("heading", { name: /Why the doubling ratio/i })).toHaveCount(0);

  await main(page).getByRole("button", { name: "Graduate" }).click();
  await expect(main(page).getByRole("heading", { name: /Why the doubling ratio/i })).toBeVisible();
});

test("a lesson with no optional passes shows no path selector", async ({ page }) => {
  await page.goto(L01);
  // Only "Core" would be offered, so the selector suppresses itself entirely.
  await expect(main(page).getByText("Go deeper")).toHaveCount(0);
});

test("the core spine is the default, so a first visit is not overwhelming", async ({ page }) => {
  await page.goto(L02);
  await expect(main(page).getByRole("heading", { name: /accidentally quadratic/i })).toBeVisible();
  await expect(
    main(page).getByRole("heading", { name: /Recognising this in an interview/i }),
  ).toHaveCount(0);
  await expect(main(page).getByRole("button", { name: "Core" })).toBeVisible();
});
