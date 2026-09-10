"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  emptyExerciseProgress,
  PROGRESS_NAMESPACE,
  readProgressSnapshot,
  subscribeToProgress,
  writeProgress,
  type ExerciseProgress,
  type LessonProgress,
} from "./curriculum-progress";

/**
 * Progress for a problem opened outside a lesson.
 *
 * Stored under one key rather than one per problem, so the bank can show solved
 * state across hundreds of rows without hundreds of storage reads.
 */
const BANK_KEY = `${PROGRESS_NAMESPACE}:problem-bank`;

type BankState = Pick<LessonProgress, "schemaVersion" | "contentHash" | "exercises">;

function parseBank(raw: string | null): Record<string, ExerciseProgress> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<BankState>;
    if (parsed.schemaVersion !== 1) return {};
    return parsed.exercises ?? {};
  } catch {
    return {};
  }
}

export function useProblemBankProgress(): Record<string, ExerciseProgress> {
  const raw = useSyncExternalStore(
    subscribeToProgress,
    () => readProgressSnapshot(BANK_KEY),
    () => null,
  );
  return useMemo(() => parseBank(raw), [raw]);
}

export function useProblemProgress(problemId: string) {
  const all = useProblemBankProgress();
  const progress = all[problemId];

  const update = useCallback(
    (mutate: (current: ExerciseProgress) => ExerciseProgress) => {
      const current = parseBank(readProgressSnapshot(BANK_KEY));
      const next = {
        ...current,
        [problemId]: mutate(current[problemId] ?? emptyExerciseProgress()),
      };
      writeProgress(BANK_KEY, {
        schemaVersion: 1,
        // The bank spans many problems, so no single content hash applies.
        contentHash: "bank",
        completedBlocks: {},
        quizAnswers: {},
        quizSubmitted: {},
        checkpointResponses: {},
        exercises: next,
      });
    },
    [problemId],
  );

  return { progress, update };
}
