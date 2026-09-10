import { test, expect } from "@playwright/test";
import { openExercise, setEditorContent } from "./helpers";

const LESSON = "/learn/t1-foundations/s01-ground-floor/l01-values-and-names";

test.describe.configure({ timeout: 240_000 });

/**
 * The regression test for the worst bug in the previous runner: Pyodide ran on
 * the main thread, so `while True:` froze the tab permanently. What matters is
 * not only that the run is stopped, but that the PAGE IS STILL INTERACTIVE and
 * a second run still works afterwards.
 */
test("an infinite loop is killed and the page stays interactive", async ({ page }) => {
  await page.goto(LESSON);
  const { shell, editor, run } = await openExercise(page, "package-summary");

  await setEditorContent(page, editor, "while True:\n    pass\n");
  await run.click();

  await expect(shell.getByText(/ran longer than/i)).toBeVisible({ timeout: 90_000 });

  // Proof the main thread was never blocked: interact, then run again.
  await shell.getByRole("button", { name: /^Reset$/ }).click();
  await expect(editor).toContainText("def summarise");

  await expect(run).toBeEnabled({ timeout: 180_000 });
  await setEditorContent(
    page,
    editor,
    'def summarise(packages):\n    return {"count": 0, "total_kb": 0, "largest": None}\n',
  );
  await run.click();
  await expect(shell.getByText("An empty list returns zeros and None")).toBeVisible({
    timeout: 90_000,
  });
});
