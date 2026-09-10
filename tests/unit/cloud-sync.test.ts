import { describe, expect, it } from "vitest";
import { __testing } from "@/lib/progress/cloud-sync";
import { emptyProgress } from "@/lib/progress/curriculum-progress";

/**
 * The merge rule decides what happens when a learner works on two devices.
 * Getting it wrong silently deletes work, so it is tested directly.
 */
const { mergeLesson, mergeBundles } = __testing;

function withBlocks(n: number) {
  const p = emptyProgress("h");
  for (let i = 0; i < n; i += 1) p.completedBlocks[`b${i}`] = true;
  return p;
}

describe("mergeLesson", () => {
  it("keeps the record with more completed blocks, whichever side it is on", () => {
    expect(
      Object.keys(mergeLesson(withBlocks(1), withBlocks(3)).completedBlocks),
    ).toHaveLength(3);
    expect(
      Object.keys(mergeLesson(withBlocks(3), withBlocks(1)).completedBlocks),
    ).toHaveLength(3);
  });

  it("prefers a solved exercise over more attempts at an unsolved one", () => {
    const attempts = emptyProgress("h");
    attempts.exercises.x = {
      attempts: 4, bestScore: 1, possible: 3, solved: false,
      hintsRevealed: 0, solutionRevealed: false,
    };
    const solved = emptyProgress("h");
    solved.exercises.x = {
      attempts: 1, bestScore: 3, possible: 3, solved: true,
      hintsRevealed: 0, solutionRevealed: false,
    };
    expect(mergeLesson(attempts, solved).exercises.x.solved).toBe(true);
  });

  it("prefers a completed lesson over an in-progress one", () => {
    const done = withBlocks(1);
    done.completedAt = "2026-01-01T00:00:00.000Z";
    expect(mergeLesson(withBlocks(2), done).completedAt).toBeDefined();
  });

  it("is stable when both sides are equal", () => {
    const a = withBlocks(2);
    expect(mergeLesson(a, withBlocks(2))).toBe(a);
  });
});

describe("mergeBundles", () => {
  it("keeps lessons that exist only on one side", () => {
    const merged = mergeBundles(
      { "t1/s01/l01": withBlocks(1) },
      { "t1/s01/l02": withBlocks(1) },
    );
    expect(Object.keys(merged).sort()).toEqual(["t1/s01/l01", "t1/s01/l02"]);
  });

  it("never loses local work when the cloud copy is behind", () => {
    const merged = mergeBundles(
      { "t1/s01/l01": withBlocks(5) },
      { "t1/s01/l01": withBlocks(1) },
    );
    expect(Object.keys(merged["t1/s01/l01"].completedBlocks)).toHaveLength(5);
  });
});
