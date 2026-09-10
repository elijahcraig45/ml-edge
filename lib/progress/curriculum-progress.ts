"use client";

/**
 * v2 learner progress.
 *
 * Namespaced away from v1's `lesson-progress:{courseSlug}:{lessonId}` keys so
 * the two systems cannot read each other's payloads while they coexist.
 *
 * Three defences against stale state, because one is not enough:
 *  1. a distinct key prefix, so v1's storage subscriber ignores our writes;
 *  2. `schemaVersion`, so an unrecognised payload is discarded, not coerced;
 *  3. `contentHash`, so editing a lesson resets block completion but keeps
 *     exercise attempts and best scores.
 *
 * Block completion is a Record keyed by block id, never a positional array —
 * v1 used arrays, so inserting a block silently shifted every saved checkmark
 * onto the wrong content.
 */

export const PROGRESS_NAMESPACE = "mle.learn.v2";
export const PROGRESS_EVENT = "ml-edge:curriculum-progress";
const SCHEMA_VERSION = 1;

export type ExerciseProgress = {
  /** Latest submission, so a learner does not lose work on reload. */
  draft?: string;
  attempts: number;
  bestScore: number;
  possible: number;
  solved: boolean;
  hintsRevealed: number;
  solutionRevealed: boolean;
};

export type LessonProgress = {
  schemaVersion: number;
  contentHash: string;
  completedBlocks: Record<string, boolean>;
  quizAnswers: Record<string, number[]>;
  quizSubmitted: Record<string, boolean>;
  checkpointResponses: Record<string, string>;
  exercises: Record<string, ExerciseProgress>;
  completedAt?: string;
};

export function lessonProgressKey(lessonId: string): string {
  return `${PROGRESS_NAMESPACE}:${lessonId}`;
}

export function emptyProgress(contentHash: string): LessonProgress {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentHash,
    completedBlocks: {},
    quizAnswers: {},
    quizSubmitted: {},
    checkpointResponses: {},
    exercises: {},
  };
}

export function emptyExerciseProgress(): ExerciseProgress {
  return {
    attempts: 0,
    bestScore: 0,
    possible: 0,
    solved: false,
    hintsRevealed: 0,
    solutionRevealed: false,
  };
}

/**
 * Returns the raw localStorage string, NOT a parsed object.
 *
 * `useSyncExternalStore` compares snapshots by identity; returning a freshly
 * parsed object on every call causes an infinite render loop (React error
 * #185). Parsing belongs in a `useMemo` downstream. v1 documents the same
 * constraint — see components/curriculum/course-outline.tsx.
 */
export function readProgressSnapshot(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // Private mode, blocked site data, or a sandboxed preview.
    return null;
  }
}

export function subscribeToProgress(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(`${PROGRESS_NAMESPACE}:`)) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(PROGRESS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PROGRESS_EVENT, onStoreChange);
  };
}

export function writeProgress(storageKey: string, progress: LessonProgress): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Out of quota or storage disabled: progress is a convenience, not a
    // correctness requirement, so degrade silently rather than breaking a run.
    return;
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: storageKey }));
}

/**
 * Reconciles a stored payload with the lesson as it exists now.
 * Unknown schema versions are dropped; a content change resets block
 * completion but preserves exercise work, which is the expensive part.
 */
export function parseProgress(
  raw: string | null,
  contentHash: string,
): LessonProgress {
  if (!raw) return emptyProgress(contentHash);

  let parsed: Partial<LessonProgress>;
  try {
    parsed = JSON.parse(raw) as Partial<LessonProgress>;
  } catch {
    return emptyProgress(contentHash);
  }

  if (parsed.schemaVersion !== SCHEMA_VERSION) return emptyProgress(contentHash);

  const base: LessonProgress = {
    ...emptyProgress(contentHash),
    ...parsed,
    schemaVersion: SCHEMA_VERSION,
    contentHash,
  };

  if (parsed.contentHash !== contentHash) {
    return {
      ...base,
      completedBlocks: {},
      quizAnswers: {},
      quizSubmitted: {},
      completedAt: undefined,
      // Exercise attempts, drafts and best scores survive an edit.
      exercises: parsed.exercises ?? {},
    };
  }

  return base;
}

/** Denominator is track-aware, so switching tracks cannot corrupt completion. */
export function completionRatio(
  progress: LessonProgress,
  requiredBlockIds: string[],
): { done: number; total: number } {
  const done = requiredBlockIds.filter((id) => progress.completedBlocks[id]).length;
  return { done, total: requiredBlockIds.length };
}
