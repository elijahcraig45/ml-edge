import { test, expect } from "@playwright/test";
import { openExercise, setEditorContent } from "./helpers";

const LESSON = "/learn/t1-foundations/s01-ground-floor/l01-values-and-names";

test.describe.configure({ timeout: 240_000 });

test("CodeMirror replaces the textarea and keeps the code runnable", async ({ page }) => {
  await page.goto(LESSON);
  const { shell, editor, run } = await openExercise(page, "package-summary");

  // Line numbers are the visible sign the real editor took over.
  await expect(shell.locator(".cm-gutters")).toBeVisible();

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

test("Reset restores the starter through the editor", async ({ page }) => {
  await page.goto(LESSON);
  const { shell, editor } = await openExercise(page, "package-summary", {
    waitForRuntime: false,
  });

  await setEditorContent(page, editor, "# scratch");
  await expect(editor).toContainText("# scratch");

  await shell.getByRole("button", { name: /^Reset$/ }).click();
  await expect(editor).toContainText("def summarise");
});
