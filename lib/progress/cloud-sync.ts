"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "@firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import type { User } from "@firebase/auth";
import {
  PROGRESS_NAMESPACE,
  readProgressSnapshot,
  writeProgress,
  type LessonProgress,
} from "./curriculum-progress";

/**
 * Two-way progress sync.
 *
 * v1 mirrored completions to Firestore but never read them back, so signing in
 * on a new device restored nothing — the mirror was write-only telemetry. This
 * merges in both directions instead.
 *
 * localStorage remains the source of truth for rendering: the site works fully
 * signed out, and the cloud copy is a convenience that must never be on the
 * critical path. Every operation here is best-effort.
 */

const DOC_PATH = ["users", "curriculumProgress"] as const;
/** Merge granularity is the whole per-lesson record, keyed by lesson id. */
type ProgressBundle = Record<string, LessonProgress>;

function localBundle(): ProgressBundle {
  const bundle: ProgressBundle = {};
  if (typeof window === "undefined") return bundle;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${PROGRESS_NAMESPACE}:`)) continue;
      const raw = readProgressSnapshot(key);
      if (!raw) continue;
      bundle[key.slice(PROGRESS_NAMESPACE.length + 1)] = JSON.parse(raw) as LessonProgress;
    }
  } catch {
    // Storage unavailable or a malformed entry; sync what we could read.
  }
  return bundle;
}

/**
 * Later work wins, per lesson.
 *
 * Comparing counts rather than timestamps: clock skew between devices is real,
 * and "more blocks done and more exercises attempted" is a better proxy for
 * "further along" than a wall-clock the client controls.
 */
function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  const score = (p: LessonProgress) =>
    Object.values(p.completedBlocks).filter(Boolean).length +
    Object.values(p.exercises).reduce(
      (sum, e) => sum + e.attempts + (e.solved ? 5 : 0),
      0,
    ) +
    (p.completedAt ? 10 : 0);
  return score(b) > score(a) ? b : a;
}

function mergeBundles(local: ProgressBundle, remote: ProgressBundle): ProgressBundle {
  const merged: ProgressBundle = { ...local };
  for (const [lessonId, remoteProgress] of Object.entries(remote)) {
    const localProgress = merged[lessonId];
    merged[lessonId] = localProgress
      ? mergeLesson(localProgress, remoteProgress)
      : remoteProgress;
  }
  return merged;
}

/**
 * Pulls the cloud copy, merges it with local, writes the result to both.
 * Returns the number of lessons that changed locally.
 */
export async function syncProgress(user: User): Promise<number> {
  if (!firestore) return 0;

  const ref = doc(firestore, DOC_PATH[0], user.uid, "progress", DOC_PATH[1]);
  const local = localBundle();

  let remote: ProgressBundle = {};
  try {
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      remote = (snapshot.data().lessons ?? {}) as ProgressBundle;
    }
  } catch {
    // Offline or rules denied. Keep working from local.
    return 0;
  }

  const merged = mergeBundles(local, remote);

  let restored = 0;
  for (const [lessonId, progress] of Object.entries(merged)) {
    const key = `${PROGRESS_NAMESPACE}:${lessonId}`;
    if (readProgressSnapshot(key) === JSON.stringify(progress)) continue;
    writeProgress(key, progress);
    restored += 1;
  }

  try {
    await setDoc(
      ref,
      { lessons: merged, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // Best effort: the local copy is already correct.
  }

  return restored;
}

/** Exposed for unit tests; the merge rule decides whether work is lost. */
export const __testing = { mergeLesson, mergeBundles };
