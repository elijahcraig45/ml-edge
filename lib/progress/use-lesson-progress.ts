"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  emptyExerciseProgress,
  lessonProgressKey,
  parseProgress,
  readProgressSnapshot,
  subscribeToProgress,
  writeProgress,
  type ExerciseProgress,
  type LessonProgress,
} from "./curriculum-progress";

/**
 * Reads and writes one lesson's progress.
 *
 * The store returns a raw string and parsing happens in `useMemo`, which is
 * what keeps `getSnapshot` referentially stable (see curriculum-progress.ts).
 */
export function useLessonProgress(lessonId: string, contentHash: string) {
  const storageKey = lessonProgressKey(lessonId);

  const raw = useSyncExternalStore(
    subscribeToProgress,
    () => readProgressSnapshot(storageKey),
    () => null, // server snapshot: no storage during SSR
  );

  const progress = useMemo(
    () => parseProgress(raw, contentHash),
    [raw, contentHash],
  );

  const update = useCallback(
    (mutate: (current: LessonProgress) => LessonProgress) => {
      const current = parseProgress(readProgressSnapshot(storageKey), contentHash);
      writeProgress(storageKey, mutate(current));
    },
    [storageKey, contentHash],
  );

  const setBlockComplete = useCallback(
    (blockId: string, complete: boolean) =>
      update((current) => ({
        ...current,
        completedBlocks: { ...current.completedBlocks, [blockId]: complete },
      })),
    [update],
  );

  const setCheckpointResponse = useCallback(
    (blockId: string, text: string) =>
      update((current) => ({
        ...current,
        checkpointResponses: { ...current.checkpointResponses, [blockId]: text },
      })),
    [update],
  );

  const setQuizAnswers = useCallback(
    (blockId: string, answers: number[], submitted: boolean) =>
      update((current) => ({
        ...current,
        quizAnswers: { ...current.quizAnswers, [blockId]: answers },
        quizSubmitted: { ...current.quizSubmitted, [blockId]: submitted },
      })),
    [update],
  );

  const updateExercise = useCallback(
    (exerciseId: string, mutate: (current: ExerciseProgress) => ExerciseProgress) =>
      update((current) => ({
        ...current,
        exercises: {
          ...current.exercises,
          [exerciseId]: mutate(current.exercises[exerciseId] ?? emptyExerciseProgress()),
        },
      })),
    [update],
  );

  const markLessonComplete = useCallback(
    () =>
      update((current) => ({
        ...current,
        completedAt: current.completedAt ?? new Date().toISOString(),
      })),
    [update],
  );

  return {
    progress,
    setBlockComplete,
    setCheckpointResponse,
    setQuizAnswers,
    updateExercise,
    markLessonComplete,
  };
}
