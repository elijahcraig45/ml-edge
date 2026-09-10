import { describe, expect, it } from "vitest";
import {
  exerciseSchema,
  lessonFrontmatterSchema,
  stageManifestSchema,
} from "@/lib/curriculum/schema";

/**
 * The schema is the contract that stops half-authored content shipping.
 * These tests pin the fields that exist specifically to prevent v1's failure
 * mode, where a lesson with no real body silently rendered generated filler.
 */

const validFrontmatter = {
  id: "t1/s01/l01",
  title: "A lesson",
  tier: "t1-foundations",
  stage: "s01-ground-floor",
  estimatedMinutes: 40,
  objectives: ["Do a thing"],
  misconceptions: ["People think X"],
  masteryChecklist: ["I can do the thing"],
};

describe("lesson frontmatter", () => {
  it("accepts a complete lesson", () => {
    expect(lessonFrontmatterSchema.safeParse(validFrontmatter).success).toBe(true);
  });

  it("defaults status to draft, so nothing publishes by accident", () => {
    const parsed = lessonFrontmatterSchema.parse(validFrontmatter);
    expect(parsed.status).toBe("draft");
  });

  it.each([
    ["objectives", { objectives: [] }],
    ["misconceptions", { misconceptions: [] }],
    ["masteryChecklist", { masteryChecklist: [] }],
  ])("rejects a lesson with no %s", (_field, override) => {
    const result = lessonFrontmatterSchema.safeParse({ ...validFrontmatter, ...override });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed lesson id", () => {
    for (const id of ["t1/s1/l1", "s01/l01", "t9/s01/l01", "t1-s01-l01"]) {
      expect(lessonFrontmatterSchema.safeParse({ ...validFrontmatter, id }).success).toBe(false);
    }
  });

  it("rejects an unknown tier", () => {
    const result = lessonFrontmatterSchema.safeParse({
      ...validFrontmatter,
      tier: "t9-nonsense",
    });
    expect(result.success).toBe(false);
  });
});

describe("exercises", () => {
  const python = {
    kind: "python",
    id: "an-exercise",
    title: "An exercise",
    difficulty: 2,
    prompt: "Do it",
    hints: ["a nudge"],
    solutionWalkthrough: "Here is why",
    starter: "def f(): pass",
    solution: "def f(): return 1",
    tests: [{ id: "t1", label: "works", code: "assert f() == 1" }],
  };

  it("accepts a complete Python exercise", () => {
    expect(exerciseSchema.safeParse(python).success).toBe(true);
  });

  it("requires at least one hint and one test", () => {
    expect(exerciseSchema.safeParse({ ...python, hints: [] }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...python, tests: [] }).success).toBe(false);
  });

  it("rejects a difficulty outside 1-5", () => {
    expect(exerciseSchema.safeParse({ ...python, difficulty: 6 }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...python, difficulty: 0 }).success).toBe(false);
  });

  it("defaults SQL grading rather than requiring every knob", () => {
    const parsed = exerciseSchema.parse({
      kind: "sql",
      id: "a-query",
      title: "A query",
      difficulty: 1,
      datasetId: "package-registry",
      prompt: "Select it",
      hints: ["a nudge"],
      solutionWalkthrough: "Because",
      starter: "SELECT 1",
      solution: "SELECT 2",
    });
    expect(parsed.kind).toBe("sql");
    if (parsed.kind === "sql") {
      expect(parsed.grading.compare).toBe("multiset");
      expect(parsed.grading.columnMatch).toBe("byName");
    }
  });
});

describe("stage manifest", () => {
  it("requires outcomes and at least one lesson", () => {
    const base = {
      id: "s01-ground-floor",
      tier: "t1-foundations",
      order: 1,
      title: "Stage",
      thesis: "A thesis",
      summary: "A summary",
      outcomes: ["An outcome"],
      lessons: ["l01-a"],
    };
    expect(stageManifestSchema.safeParse(base).success).toBe(true);
    expect(stageManifestSchema.safeParse({ ...base, outcomes: [] }).success).toBe(false);
    expect(stageManifestSchema.safeParse({ ...base, lessons: [] }).success).toBe(false);
  });
});
