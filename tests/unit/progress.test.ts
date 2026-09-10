import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  completionRatio,
  emptyProgress,
  lessonProgressKey,
  parseProgress,
  readProgressSnapshot,
  writeProgress,
} from "@/lib/progress/curriculum-progress";

describe("progress key namespacing", () => {
  it("does not collide with v1 lesson-progress keys", () => {
    const key = lessonProgressKey("t1/s01/l01");
    expect(key.startsWith("lesson-progress:")).toBe(false);
    expect(key).toBe("mle.learn.v2:t1/s01/l01");
  });
});

describe("parseProgress", () => {
  it("returns empty progress for missing storage", () => {
    expect(parseProgress(null, "abc").completedBlocks).toEqual({});
  });

  it("discards an unknown schema version rather than coercing it", () => {
    const stale = JSON.stringify({ schemaVersion: 99, completedBlocks: { a: true } });
    expect(parseProgress(stale, "abc").completedBlocks).toEqual({});
  });

  it("discards unparseable payloads", () => {
    expect(parseProgress("{not json", "abc").completedBlocks).toEqual({});
  });

  it("keeps block completion when the content hash is unchanged", () => {
    const saved = { ...emptyProgress("hash-1"), completedBlocks: { intro: true } };
    const result = parseProgress(JSON.stringify(saved), "hash-1");
    expect(result.completedBlocks).toEqual({ intro: true });
  });

  it("resets block completion but preserves exercise work when content changes", () => {
    const saved = {
      ...emptyProgress("hash-1"),
      completedBlocks: { intro: true },
      completedAt: "2026-01-01T00:00:00.000Z",
      exercises: {
        "two-sum": {
          attempts: 3,
          bestScore: 2,
          possible: 3,
          solved: false,
          hintsRevealed: 1,
          solutionRevealed: false,
          draft: "def solve(): ...",
        },
      },
    };
    const result = parseProgress(JSON.stringify(saved), "hash-2");
    expect(result.completedBlocks).toEqual({});
    expect(result.completedAt).toBeUndefined();
    expect(result.exercises["two-sum"].attempts).toBe(3);
    expect(result.exercises["two-sum"].draft).toBe("def solve(): ...");
  });
});

describe("storage snapshots", () => {
  beforeEach(() => window.localStorage.clear());

  it("returns a referentially stable snapshot across calls", () => {
    const key = lessonProgressKey("t1/s01/l01");
    writeProgress(key, emptyProgress("hash-1"));
    const a = readProgressSnapshot(key);
    const b = readProgressSnapshot(key);
    // Strings compare by value; identity stability is what prevents React #185.
    expect(Object.is(a, b)).toBe(true);
  });

  it("survives localStorage throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readProgressSnapshot("anything")).toBeNull();
    spy.mockRestore();
  });
});

describe("completionRatio", () => {
  it("counts only the blocks required for the active track", () => {
    const progress = {
      ...emptyProgress("h"),
      completedBlocks: { a: true, b: true, c: true },
    };
    expect(completionRatio(progress, ["a", "b"])).toEqual({ done: 2, total: 2 });
    expect(completionRatio(progress, ["a", "d"])).toEqual({ done: 1, total: 2 });
  });
});
