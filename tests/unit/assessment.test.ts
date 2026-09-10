// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildStageAssessment } from "@/lib/curriculum/assessment";
import { compileStageStandalone } from "@/lib/curriculum/compile";
import path from "node:path";

/**
 * Stage gates are derived from stage content rather than authored separately,
 * so they can never drift from the lessons. These tests pin the derivation
 * rules that make that safe.
 */
const STAGE_DIR = path.join(
  process.cwd(),
  "content/t1-foundations/s01-ground-floor",
);

describe("buildStageAssessment", () => {
  it("draws questions from the stage's own lessons", async () => {
    const stage = await compileStageStandalone(STAGE_DIR);
    const assessment = buildStageAssessment(stage);
    expect(assessment).not.toBeNull();

    const lessonIds = new Set(stage.lessons.map((l) => l.id));
    for (const question of assessment!.questions) {
      expect(lessonIds.has(question.lessonId)).toBe(true);
    }
  }, 60_000);

  it("spreads questions across lessons instead of exhausting the first", async () => {
    const stage = await compileStageStandalone(STAGE_DIR);
    const assessment = buildStageAssessment(stage)!;
    const lessons = new Set(assessment.questions.map((q) => q.lessonId));
    // Six lessons in this stage; a naive "first N" would draw from two or three.
    expect(lessons.size).toBeGreaterThanOrEqual(4);
  }, 60_000);

  it("sets a passing score below the question count but above half", async () => {
    const stage = await compileStageStandalone(STAGE_DIR);
    const assessment = buildStageAssessment(stage)!;
    expect(assessment.passingScore).toBeGreaterThan(assessment.questions.length / 2);
    expect(assessment.passingScore).toBeLessThanOrEqual(assessment.questions.length);
  }, 60_000);

  it("covers both languages in its exercises when the stage has both", async () => {
    const stage = await compileStageStandalone(STAGE_DIR);
    const assessment = buildStageAssessment(stage)!;
    const kinds = new Set(assessment.exercises.map((e) => e.exercise.kind));
    expect(kinds.has("python")).toBe(true);
    expect(kinds.has("sql")).toBe(true);
  }, 60_000);

  it("returns null for a stage with too little to test", () => {
    expect(
      buildStageAssessment({
        id: "s99",
        tierId: "t1-foundations",
        order: 99,
        title: "Empty",
        thesis: "",
        summary: "",
        status: "draft",
        outcomes: [],
        lessons: [],
      }),
    ).toBeNull();
  });
});
