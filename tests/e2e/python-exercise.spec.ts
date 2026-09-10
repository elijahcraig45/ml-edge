import { test, expect } from "@playwright/test";
import { openExercise, setEditorContent } from "./helpers";

const LESSON = "/learn/t1-foundations/s01-ground-floor/l01-values-and-names";

const SOLUTION = `def summarise(packages):
    if not packages:
        return {"count": 0, "total_kb": 0, "largest": None}
    largest = max(packages, key=lambda p: p["size_kb"])
    return {
        "count": len(packages),
        "total_kb": sum(p["size_kb"] for p in packages),
        "largest": largest["name"],
    }
`;

const STUB = `def summarise(packages):
    return {"count": 0, "total_kb": 0, "largest": None}
`;

// Pyodide downloads a multi-megabyte runtime on first use.
test.describe.configure({ timeout: 240_000 });

test("a correct solution passes every test and persists progress", async ({ page }) => {
  await page.goto(LESSON);
  const { shell, editor, run } = await openExercise(page, "package-summary");

  await setEditorContent(page, editor, SOLUTION);
  await run.click();

  await expect(shell).toHaveAttribute("data-solved", "true", { timeout: 60_000 });
  // Hidden tests report a result without revealing their body.
  await expect(shell.getByText(/\[hidden\]/).first()).toBeVisible();

  await page.reload();
  const after = page.getByTestId("exercise-package-summary");
  await expect(after).toHaveAttribute("data-solved", "true", { timeout: 60_000 });
});

test("a wrong answer reports which check failed", async ({ page }) => {
  await page.goto(LESSON);
  const { shell, editor, run } = await openExercise(page, "package-summary");

  await setEditorContent(page, editor, STUB);
  await run.click();

  // The empty case passes; the populated ones must not.
  await expect(shell.getByText("An empty list returns zeros and None")).toBeVisible({
    timeout: 60_000,
  });
  await expect(shell).toHaveAttribute("data-solved", "false");
});
