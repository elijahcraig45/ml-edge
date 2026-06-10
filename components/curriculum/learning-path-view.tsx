"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import type { ResolvedLearningPath } from "@/lib/learning-paths";
import {
  buildLessonProgressStorageKey,
  readLessonProgressSnapshot,
  subscribeToLessonProgress,
} from "@/lib/lesson-progress";

type LearningPathViewProps = {
  path: ResolvedLearningPath;
};

function isLessonComplete(courseSlug: string, lessonId: string): boolean {
  const rawValue = readLessonProgressSnapshot(
    buildLessonProgressStorageKey(courseSlug, lessonId),
  );

  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue) as { lessonCompleted?: boolean };
    return parsed.lessonCompleted === true;
  } catch {
    return false;
  }
}

export function LearningPathView({ path }: LearningPathViewProps) {
  // Flatten every (courseSlug, lessonId) pair once so the snapshot can scan them.
  const courseLessons = useMemo(
    () =>
      path.phases.flatMap((phase) =>
        phase.courses.flatMap((course) =>
          course.lessonIds.map((lessonId) => ({ courseSlug: course.slug, lessonId })),
        ),
      ),
    [path],
  );

  // useSyncExternalStore snapshots must return a stable primitive — returning a
  // fresh array/object each call triggers React error #185. Serialize the set of
  // completed "courseSlug::lessonId" keys to a sorted, comma-joined string.
  const completedKeysStr = useSyncExternalStore(
    subscribeToLessonProgress,
    () =>
      courseLessons
        .filter(({ courseSlug, lessonId }) => isLessonComplete(courseSlug, lessonId))
        .map(({ courseSlug, lessonId }) => `${courseSlug}::${lessonId}`)
        .sort()
        .join(","),
    () => "",
  );

  const completedKeys = useMemo(
    () => new Set(completedKeysStr ? completedKeysStr.split(",") : []),
    [completedKeysStr],
  );

  const completedFor = (courseSlug: string, lessonIds: string[]) =>
    lessonIds.filter((lessonId) => completedKeys.has(`${courseSlug}::${lessonId}`)).length;

  const totalCompleted = completedKeys.size;
  const overallPct =
    path.totalLessons > 0 ? Math.round((totalCompleted / path.totalLessons) * 100) : 0;

  // The next lesson to study: first incomplete lesson in track order. Cheap to
  // recompute each render, so no manual memoization (keeps the React Compiler happy).
  const nextStep = (() => {
    for (const phase of path.phases) {
      for (const course of phase.courses) {
        const nextLessonId = course.lessonIds.find(
          (lessonId) => !completedKeys.has(`${course.slug}::${lessonId}`),
        );
        if (nextLessonId) {
          return { courseSlug: course.slug, lessonId: nextLessonId, shortTitle: course.shortTitle };
        }
      }
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {/* Overall progress header */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
              Track progress
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {totalCompleted}/{path.totalLessons}{" "}
              <span className="text-base font-normal text-slate-400">lessons · {overallPct}%</span>
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{path.outcome}</p>
          </div>
          {nextStep ? (
            <Link
              href={`/curriculum/authored/${nextStep.courseSlug}/lessons/${nextStep.lessonId}`}
              className="shrink-0 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
            >
              {totalCompleted === 0 ? "Start the track" : `Continue · ${nextStep.shortTitle}`}
            </Link>
          ) : (
            <span className="shrink-0 rounded-full border border-emerald-400/30 px-5 py-3 text-sm font-semibold text-emerald-200">
              Track complete 🎉
            </span>
          )}
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-indigo-400 transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      {path.phases.map((phase) => (
        <div key={phase.id} className="rounded-3xl border border-white/10 bg-slate-900/40 p-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-50">{phase.title}</h2>
              <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {phase.timeframe}
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">{phase.rationale}</p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {phase.courses.map((course) => {
              const completed = completedFor(course.slug, course.lessonIds);
              const isDone = course.lessonCount > 0 && completed === course.lessonCount;
              const continueLessonId =
                course.lessonIds.find((id) => !completedKeys.has(`${course.slug}::${id}`)) ??
                course.firstLessonId;

              return (
                <Link
                  key={course.slug}
                  href={`/curriculum/authored/${course.slug}/lessons/${continueLessonId ?? ""}`}
                  className={[
                    "group block rounded-2xl border p-5 transition hover:bg-slate-950/70",
                    isDone
                      ? "border-emerald-400/30 bg-emerald-500/5"
                      : "border-white/10 bg-slate-950/55 hover:border-indigo-400/30",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{course.title}</h3>
                    {isDone ? (
                      <span className="shrink-0 rounded-full border border-emerald-400/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                        Done
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{course.summary}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={[
                          "h-full rounded-full transition-all",
                          isDone ? "bg-emerald-400" : "bg-indigo-400",
                        ].join(" ")}
                        style={{
                          width: `${
                            course.lessonCount > 0
                              ? Math.round((completed / course.lessonCount) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">
                      {completed}/{course.lessonCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
