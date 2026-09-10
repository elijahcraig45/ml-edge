import { beforeEach, describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/progress/streak";
import {
  emptyProgress,
  lessonProgressKey,
  writeProgress,
} from "@/lib/progress/curriculum-progress";

function complete(lessonId: string, isoDay: string) {
  const progress = { ...emptyProgress("h"), completedAt: `${isoDay}T12:00:00.000Z` };
  writeProgress(lessonProgressKey(lessonId), progress);
}

const NOW = new Date("2026-03-10T09:00:00.000Z");

describe("study streak", () => {
  beforeEach(() => window.localStorage.clear());

  it("is zero with no completions", () => {
    expect(computeStreak(NOW)).toEqual({ current: 0, longest: 0, days: [] });
  });

  it("counts consecutive days ending today", () => {
    complete("t1/s01/l01", "2026-03-08");
    complete("t1/s01/l02", "2026-03-09");
    complete("t1/s01/l03", "2026-03-10");
    expect(computeStreak(NOW).current).toBe(3);
  });

  it("stays live when the last completion was yesterday", () => {
    complete("t1/s01/l01", "2026-03-08");
    complete("t1/s01/l02", "2026-03-09");
    expect(computeStreak(NOW).current).toBe(2);
  });

  it("resets once a day is missed", () => {
    complete("t1/s01/l01", "2026-03-01");
    complete("t1/s01/l02", "2026-03-02");
    expect(computeStreak(NOW).current).toBe(0);
  });

  it("still reports the longest run after the current one lapses", () => {
    for (const day of ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"]) {
      complete(`lesson-${day}`, day);
    }
    const streak = computeStreak(NOW);
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(4);
  });

  it("counts a day once even when several lessons finish on it", () => {
    complete("t1/s01/l01", "2026-03-10");
    complete("t1/s01/l02", "2026-03-10");
    expect(computeStreak(NOW).days).toEqual(["2026-03-10"]);
    expect(computeStreak(NOW).current).toBe(1);
  });
});
