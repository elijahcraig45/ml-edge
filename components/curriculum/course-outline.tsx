"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  buildLessonProgressStorageKey,
  readLessonProgressSnapshot,
  subscribeToLessonProgress,
} from "@/lib/lesson-progress";

type CourseOutlineLesson = {
  id: string;
  title: string;
  summary: string;
  duration: string;
};

type CourseOutlineModule = {
  id: string;
  title: string;
  level: string;
  focus: string;
  lessons: CourseOutlineLesson[];
};

type CourseOutlineProps = {
  courseSlug: string;
  modules: CourseOutlineModule[];
  lessonPathPrefix?: string;
};

export function CourseOutline({
  courseSlug,
  modules,
  lessonPathPrefix = `/curriculum/${courseSlug}/lessons`,
}: CourseOutlineProps) {
  // useSyncExternalStore snapshot must return a stable primitive — returning a new
  // array on every call causes React to see differing Object.is references and
  // re-render infinitely (error #185). Serialize to a comma-joined string instead.
  const completedLessonsStr = useSyncExternalStore(
    subscribeToLessonProgress,
    () =>
      modules
        .flatMap((module) => module.lessons)
        .filter((lesson) => {
          const rawValue = readLessonProgressSnapshot(
            buildLessonProgressStorageKey(courseSlug, lesson.id),
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
        })
        .map((lesson) => lesson.id)
        .join(","),
    () => "",
  );

  const completedLessons = useMemo(
    () => (completedLessonsStr ? completedLessonsStr.split(",") : []),
    [completedLessonsStr],
  );

  const lessonSequence = useMemo(
    () => modules.flatMap((module) => module.lessons),
    [modules],
  );
  const nextLesson =
    lessonSequence.find((lesson) => !completedLessons.includes(lesson.id)) ??
    lessonSequence[lessonSequence.length - 1];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
              Course progress
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {completedLessons.length}/{lessonSequence.length}
            </p>
            <p className="mt-2 text-sm text-slate-400">Hosted lessons completed</p>
          </div>
          {nextLesson ? (
            <Link
              href={`${lessonPathPrefix}/${nextLesson.id}`}
              className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-50 hover:border-indigo-300 hover:bg-indigo-500/25"
            >
              {completedLessons.length === lessonSequence.length
                ? "Review final lesson"
                : "Continue learning"}
            </Link>
          ) : null}
        </div>
      </div>

      {modules.map((module) => (
        <div
          key={module.id}
          className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-50">{module.title}</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                  {module.level}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{module.focus}</p>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              {module.lessons.length} lessons
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {module.lessons.map((lesson, index) => {
              const isComplete = completedLessons.includes(lesson.id);

              return (
                <Link
                  key={lesson.id}
                  href={`${lessonPathPrefix}/${lesson.id}`}
                  className={[
                    "block rounded-2xl border p-4 hover:bg-slate-950/75",
                    isComplete
                      ? "border-emerald-400/30 bg-emerald-500/5"
                      : "border-white/10 bg-slate-950/55 hover:border-indigo-400/30",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
                        Lesson {index + 1}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-white">
                        {lesson.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <span className="rounded-full border border-emerald-400/30 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                          Complete
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-400">
                        {lesson.duration}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{lesson.summary}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
