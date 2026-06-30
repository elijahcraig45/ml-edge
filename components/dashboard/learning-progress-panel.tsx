"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { buildLessonProgressStorageKey, subscribeToLessonProgress, readLessonProgressSnapshot } from "@/lib/lesson-progress";

export type ProgressCourse = {
  slug: string;
  title: string;
  shortTitle: string;
  badgeEmblem: string;
  lessonIds: string[];
  firstLessonId: string | null;
  phaseTitle: string;
};

type LessonProgressSnapshot = {
  lessonCompleted?: boolean;
};

function isLessonComplete(slug: string, lessonId: string): boolean {
  const raw = readLessonProgressSnapshot(buildLessonProgressStorageKey(slug, lessonId));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as LessonProgressSnapshot;
    return parsed.lessonCompleted === true;
  } catch {
    return false;
  }
}

function computeProgress(courses: ProgressCourse[]) {
  return courses.map(course => {
    const completedCount = course.lessonIds.filter(id => isLessonComplete(course.slug, id)).length;
    const nextLessonId = course.lessonIds.find(id => !isLessonComplete(course.slug, id)) ?? null;
    return {
      ...course,
      completedCount,
      total: course.lessonIds.length,
      pct: course.lessonIds.length > 0 ? Math.round((completedCount / course.lessonIds.length) * 100) : 0,
      nextLessonId,
    };
  });
}

function useAllProgress(courses: ProgressCourse[]) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    return subscribeToLessonProgress(forceUpdate);
  }, []);

  return computeProgress(courses);
}

type Props = {
  courses: ProgressCourse[];
};

export function LearningProgressPanel({ courses }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const progress = useAllProgress(courses);

  const firstIncomplete = progress.find(c => c.nextLessonId !== null);
  const nextHref = firstIncomplete?.nextLessonId
    ? `/curriculum/authored/${firstIncomplete.slug}/lessons/${firstIncomplete.nextLessonId}`
    : "/curriculum";

  const nextLabel = firstIncomplete
    ? `${firstIncomplete.shortTitle} · ${firstIncomplete.nextLessonId}`
    : "Browse curriculum";

  return (
    <div className="space-y-4">
      {/* Step 3 card — dynamic next lesson */}
      <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">Step 3 · Learn</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {firstIncomplete
            ? <>Continue <span className="font-semibold text-slate-100">{firstIncomplete.shortTitle}</span> — pick up where you left off.</>
            : "You've completed all foundation courses. Explore the full curriculum."}
        </p>
        <Link href={nextHref} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">
          {firstIncomplete ? "Continue lesson" : "Browse curriculum"}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Phase 0 progress breakdown */}
      <div className="rounded-xl border border-white/8 bg-slate-900/50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-3">Phase 0 progress</p>
        <div className="space-y-3">
          {progress.map(course => {
            const allDone = course.completedCount === course.total;
            return (
              <div key={course.slug}>
                <div className="flex items-center justify-between mb-1">
                  <Link
                    href={
                      course.nextLessonId
                        ? `/curriculum/authored/${course.slug}/lessons/${course.nextLessonId}`
                        : `/curriculum/authored/${course.slug}`
                    }
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {allDone
                      ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      : <Circle className="h-3 w-3 text-slate-600 shrink-0" />
                    }
                    {course.shortTitle}
                  </Link>
                  <span className="text-[10px] font-mono text-slate-500">
                    {mounted ? `${course.completedCount}/${course.total}` : `—/${course.total}`}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: mounted ? `${course.pct}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
