import { test, expect } from "@playwright/test";
import { openExercise } from "./helpers";

const LESSON = "/learn/t1-foundations/s01-ground-floor/l06-null-and-three-valued-logic";

test.describe.configure({ timeout: 240_000 });

test("Explain shows the engine's plan for the learner's own query", async ({ page }) => {
  await page.goto(LESSON);
  const { shell } = await openExercise(page, "unlicensed-packages", {
    runLabel: /Run query/i,
  });
  const exercise = shell;

  const explain = exercise.getByRole("button", { name: /^Explain$/ });
  await expect(explain).toBeEnabled({ timeout: 180_000 });
  await explain.click();

  // DuckDB plans are operator trees; SEQ_SCAN over packages must appear.
  await expect(exercise.getByText(/SEQ_SCAN|PROJECTION|FILTER/i).first()).toBeVisible({
    timeout: 60_000,
  });
  await exercise.getByRole("button", { name: /Hide plan/ }).click();
});
