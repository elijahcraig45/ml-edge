"use client";

import {
  PROGRESS_NAMESPACE,
  readProgressSnapshot,
} from "./curriculum-progress";

/**
 * Study streak, derived from lesson completion dates.
 *
 * The previous streak counted daily-quiz completions. That feature is retired,
 * so the counter would have sat at zero forever — a broken motivator is worse
 * than none. This reads the same progress records the lessons write, and works
 * signed out.
 */
export type Streak = {
  current: number;
  longest: number;
  /** ISO dates (UTC) on which at least one lesson was completed. */
  days: string[];
};

export function computeStreak(now = new Date()): Streak {
  const days = new Set<string>();
  if (typeof window === "undefined") return { current: 0, longest: 0, days: [] };

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${PROGRESS_NAMESPACE}:`)) continue;
      const raw = readProgressSnapshot(key);
      if (!raw) continue;
      const completedAt = (JSON.parse(raw) as { completedAt?: string }).completedAt;
      if (completedAt) days.add(completedAt.slice(0, 10));
    }
  } catch {
    return { current: 0, longest: 0, days: [] };
  }

  const sorted = [...days].sort();
  if (sorted.length === 0) return { current: 0, longest: 0, days: [] };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = isNextDay(sorted[i - 1], sorted[i]) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // A streak stays live through today and yesterday, so finishing a lesson at
  // 11pm and again at 9am the day after next does not silently reset it.
  const today = toIsoDay(now);
  const yesterday = toIsoDay(new Date(now.getTime() - 86_400_000));
  const last = sorted[sorted.length - 1];
  const live = last === today || last === yesterday;

  let current = 0;
  if (live) {
    current = 1;
    for (let i = sorted.length - 1; i > 0; i -= 1) {
      if (!isNextDay(sorted[i - 1], sorted[i])) break;
      current += 1;
    }
  }

  return { current, longest, days: sorted };
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isNextDay(earlier: string, later: string): boolean {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  return b - a === 86_400_000;
}
