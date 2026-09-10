"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  PROGRESS_NAMESPACE,
  readProgressSnapshot,
  subscribeToProgress,
} from "./curriculum-progress";
import type { LearnerPath } from "@/lib/curriculum/types";

/**
 * Stage badges.
 *
 * The badge records which path the learner took, because "Stage 4 — Graduate
 * path" is a more legible credential than a generic completion mark, and this
 * site exists partly to be read by someone evaluating its author.
 */
const BADGES_KEY = `${PROGRESS_NAMESPACE}:badges`;

export type StageBadge = {
  stageId: string;
  path: LearnerPath;
  score: number;
  outOf: number;
  earnedAt: string;
};

function parse(raw: string | null): Record<string, StageBadge> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { version?: number; badges?: Record<string, StageBadge> };
    if (parsed.version !== 1) return {};
    return parsed.badges ?? {};
  } catch {
    return {};
  }
}

export function useBadges() {
  const raw = useSyncExternalStore(
    subscribeToProgress,
    () => readProgressSnapshot(BADGES_KEY),
    () => null,
  );
  const badges = useMemo(() => parse(raw), [raw]);

  const award = useCallback((badge: StageBadge) => {
    const current = parse(readProgressSnapshot(BADGES_KEY));
    // Never downgrade an existing badge to a worse score.
    const existing = current[badge.stageId];
    if (existing && existing.score >= badge.score) return;
    const next = { version: 1, badges: { ...current, [badge.stageId]: badge } };
    try {
      window.localStorage.setItem(BADGES_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("ml-edge:curriculum-progress", { detail: BADGES_KEY }),
    );
  }, []);

  return { badges, award };
}
