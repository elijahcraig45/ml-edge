import { test, expect, type Page } from "@playwright/test";

const BASE = "https://mledge-338436483735.us-central1.run.app";
const TODAY = new Date().toISOString().slice(0, 10);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function goto(page: Page, path: string) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  return res;
}

// ─── Navigation / shell ───────────────────────────────────────────────────────

test("homepage loads and shows nav", async ({ page }) => {
  await goto(page, "/");
  await expect(page).not.toHaveTitle(/error/i);
  // Sidebar nav items present
  await expect(page.locator("text=Dashboard").first()).toBeVisible();
  await expect(page.locator("text=Signal").first()).toBeVisible();
  await expect(page.locator("text=Quiz").first()).toBeVisible();
  await expect(page.locator("text=Practice").first()).toBeVisible();
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

test("dashboard renders stat cards", async ({ page }) => {
  await goto(page, "/dashboard");
  // Page title area
  await expect(page.locator("h1, h2").first()).toBeVisible();
  // At least one card-like element
  await expect(page.locator("[class*='rounded']").first()).toBeVisible();
});

// ─── Signal / Deep Dive ───────────────────────────────────────────────────────

test("signal list page renders latest headline", async ({ page }) => {
  await goto(page, "/signal");
  await expect(page.locator("h1, h2").first()).toBeVisible();
  // Should have at least one signal card link
  const cards = page.locator("a[href^='/signal/']");
  await expect(cards.first()).toBeVisible();
});

test("signal detail for today loads and shows TL;DR", async ({ page }) => {
  await goto(page, `/signal/${TODAY}`);
  // Should not 404
  await expect(page).not.toHaveURL(/.*not-found/);
  await expect(page.locator("text=TL;DR").first()).toBeVisible();
});

test("signal detail shows audio player when audioUrl is set", async ({ page }) => {
  await goto(page, `/signal/${TODAY}`);
  // Audio player label
  const player = page.locator("audio");
  // May or may not exist depending on generation; if present must have src
  const count = await player.count();
  if (count > 0) {
    const src = await player.first().getAttribute("src");
    expect(src).toMatch(/^https:\/\/storage\.googleapis\.com\//);
  }
});

test("signal detail themes section renders", async ({ page }) => {
  await goto(page, `/signal/${TODAY}`);
  // DailyDeepDivePanels renders themes
  await expect(page.locator("text=Theme").first()).toBeVisible();
});

// ─── Quiz ─────────────────────────────────────────────────────────────────────

test("quiz page loads with questions or cold-start banner", async ({ page }) => {
  await goto(page, "/quiz");
  const hasQuestions = await page.locator("button, [role='button']").count();
  expect(hasQuestions).toBeGreaterThan(0);
});

test("quiz page shows mini-lesson gate or cold-start message", async ({ page }) => {
  await goto(page, "/quiz");
  const hasAudio = await page.locator("audio").count();
  const hasMiniLesson = await page.getByText("Why it matters", { exact: false }).count();
  const hasColdStart = await page.getByText("4 AM", { exact: false }).count();
  expect(hasAudio + hasMiniLesson + hasColdStart).toBeGreaterThan(0);
});

test("quiz lessons archive page loads", async ({ page }) => {
  await goto(page, "/quiz/lessons");
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("quiz lesson detail for today loads", async ({ page }) => {
  const res = await goto(page, `/quiz/lessons/${TODAY}`);
  // Either shows lesson or redirects — just must not hard-crash
  expect(res?.status()).not.toBe(500);
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ─── Practice ─────────────────────────────────────────────────────────────────

test("practice page loads with topic pills and drill", async ({ page }) => {
  await goto(page, "/practice");
  await expect(page.locator("h1, h2").first()).toBeVisible();
  // Topic pills
  const pills = page.locator("a[href*='topic='], button");
  await expect(pills.first()).toBeVisible();
});

test("practice page ?topic= filter works", async ({ page }) => {
  await page.goto(`${BASE}/practice?topic=Supervised+Learning+%26+Generalization`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("h1, h2, h3").first()).toBeVisible();
});

// ─── News ─────────────────────────────────────────────────────────────────────

test("news page renders without error", async ({ page }) => {
  await goto(page, "/news");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

// ─── Curriculum ───────────────────────────────────────────────────────────────

test("curriculum page renders courses", async ({ page }) => {
  await goto(page, "/curriculum");
  await expect(page.locator("h1, h2").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ─── Cron / API guards ────────────────────────────────────────────────────────

test("cron endpoint rejects unauthenticated requests", async ({ request }) => {
  const res = await request.post(`${BASE}/api/cron/daily-update`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(401);
});

test("admin seed endpoint rejects unauthenticated requests", async ({ request }) => {
  const res = await request.post(`${BASE}/api/admin/seed-curriculum`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect([401, 403, 405]).toContain(res.status());
});
