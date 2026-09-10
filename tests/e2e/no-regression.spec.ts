import { test, expect } from "@playwright/test";

/**
 * The routes a learner can reach must never 500.
 *
 * This started life guarding the v1 curriculum, which built its course list at
 * module-evaluation time and threw on a missing lesson id — turning one bad
 * record into a 500 across the site. v1 is gone, but the guard is worth keeping:
 * the v2 loader is designed to degrade to a 404 instead, and that is exactly the
 * property being asserted.
 */
const ROUTES = ["/", "/learn", "/problems", "/interview", "/dashboard"];

for (const route of ROUTES) {
  test(`route responds without erroring: ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status(), `${route} should not 4xx/5xx`).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText("Application error");
  });
}

test("retired v1 routes redirect somewhere useful", async ({ page }) => {
  // /practice was the old question bank, so it lands on the new one.
  const redirects: Array<[string, RegExp]> = [
    ["/curriculum", /\/learn/],
    ["/curriculum/authored/data-structures-and-algorithms", /\/learn/],
    ["/quiz", /\/learn/],
    ["/signal", /\/learn/],
    ["/news", /\/learn/],
    ["/practice", /\/problems/],
  ];
  for (const [legacy, expected] of redirects) {
    await page.goto(legacy);
    await expect(page, `${legacy} should redirect`).toHaveURL(expected);
  }
});

test("curriculum assets are served, not swallowed by the legacy redirect", async ({ request }) => {
  // /curriculum/* redirects to /learn for the retired v1 routes. Assets must
  // therefore live elsewhere — a 308 here is invisible until a dataset or the
  // search index silently fails to load.
  const index = await request.get("/assets/search-index.json", {
    maxRedirects: 0,
  });
  expect(index.status()).toBe(200);
  expect(index.headers()["content-type"]).toContain("json");
});
