import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Scrolls an exercise into view and waits for its editor to settle.
 *
 * The editor starts as a plain textarea and upgrades to CodeMirror when the
 * chunk lands. Both carry the same aria-label — correctly, since it is the same
 * control — so asserting on the label mid-swap can match two elements. Waiting
 * for the upgrade makes every downstream assertion deterministic.
 *
 * Runtimes are also lazy, so this waits for the Run button to become enabled
 * rather than assuming a boot time.
 */
/**
 * The live document.
 *
 * During a navigation the App Router can briefly hold two page trees in the
 * DOM — the outgoing one is hidden, but locators still match it, producing
 * strict-mode violations that look like duplicate-render bugs. Scoping to
 * #main asserts against the page the learner is actually looking at.
 */
export function main(page: Page): Locator {
  return page.locator("#main");
}

export async function openExercise(
  page: Page,
  exerciseId: string,
  options: { runLabel?: RegExp; waitForRuntime?: boolean } = {},
) {
  const { runLabel = /Run tests/i, waitForRuntime = true } = options;

  const shell = main(page).getByTestId(`exercise-${exerciseId}`);
  const editor = shell.locator(".cm-content");

  // Wait for the editor BEFORE scrolling. Hydration replaces the textarea with
  // CodeMirror, which detaches the subtree — scrolling first races that swap
  // and fails with "element is not attached to the DOM".
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await shell.scrollIntoViewIfNeeded();

  const run = shell.getByRole("button", { name: runLabel });
  if (waitForRuntime) {
    await expect(run).toBeEnabled({ timeout: 180_000 });
  }

  return { shell, editor, run };
}

/** Replaces the editor's whole document. */
export async function setEditorContent(
  page: Page,
  editor: Locator,
  source: string,
) {
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  // Typed rather than pasted so CodeMirror's own auto-indent does not fight us:
  // every line is inserted with its leading whitespace already stripped.
  await page.keyboard.insertText(source);
}
