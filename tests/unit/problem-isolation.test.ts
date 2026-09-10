// @vitest-environment node
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileProblems } from "@/lib/curriculum/compile/problems";

/**
 * One malformed problem file must never take down the rest of the site.
 *
 * This regressed once during development: a half-written problem made the whole
 * curriculum fail to compile, which turned every lesson into a 404 because
 * `generateStaticParams` returned nothing.
 */
const BROKEN = path.join(process.cwd(), "content", "problems", "zz-broken-fixture");

beforeAll(async () => {
  await fs.mkdir(BROKEN, { recursive: true });
  await fs.writeFile(
    path.join(BROKEN, "exercise.yaml"),
    "id: zz-broken-fixture\nkind: python\n# deliberately missing every required field\n",
    "utf8",
  );
});

afterAll(async () => {
  await fs.rm(BROKEN, { recursive: true, force: true });
});

describe("problem compilation", () => {
  it("collects the failure instead of throwing", async () => {
    const result = await compileProblems();
    expect(result.errors.some((e) => e.id === "zz-broken-fixture")).toBe(true);
  });

  it("still returns every problem that did compile", async () => {
    const result = await compileProblems();
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems.every((p) => p.id !== "zz-broken-fixture")).toBe(true);
  });
});
