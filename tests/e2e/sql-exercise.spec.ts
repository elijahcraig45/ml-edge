import { test, expect } from "@playwright/test";
import { main, openExercise, setEditorContent } from "./helpers";

const L05 = "/learn/t1-foundations/s01-ground-floor/l05-relations-and-select";
const L06 = "/learn/t1-foundations/s01-ground-floor/l06-null-and-three-valued-logic";

// DuckDB-WASM is a multi-megabyte download on first use.
test.describe.configure({ timeout: 240_000 });

test("the schema panel documents the dataset", async ({ page }) => {
  await page.goto(L05);
  await expect(main(page).getByText(/Open-source package registry/)).toBeVisible();
  // Scope to the table cell: the column name also appears in prose.
  await expect(main(page).getByRole("cell", { name: "deprecated_reason" })).toBeVisible();
});

test("a correct query grades green and a wrong one shows a row diff", async ({ page }) => {
  await page.goto(L06);

  const { shell, editor, run } = await openExercise(page, "unlicensed-packages", {
    runLabel: /Run query/i,
  });

  // The starter is the buggy `<> 'MIT'` filter, which drops NULL licenses.
  await run.click();
  await expect(shell.getByText(/expected row\(s\) are missing/i)).toBeVisible({
    timeout: 90_000,
  });

  await setEditorContent(
    page,
    editor,
    "SELECT name, license FROM packages WHERE license <> 'MIT' OR license IS NULL ORDER BY name;",
  );
  await run.click();
  await expect(shell).toHaveAttribute("data-solved", "true", { timeout: 90_000 });
});

test("a scratchpad query renders NULL distinctly from an empty cell", async ({ page }) => {
  await page.goto(L06);
  const run = main(page).getByRole("button", { name: /^▶ Run$/ }).first();
  await run.scrollIntoViewIfNeeded();
  await expect(run).toBeEnabled({ timeout: 180_000 });
  await run.click();

  await expect(main(page).getByText("NULL", { exact: true }).first()).toBeVisible({
    timeout: 90_000,
  });
});
