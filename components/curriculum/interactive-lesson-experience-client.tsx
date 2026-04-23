"use client";

import dynamic from "next/dynamic";
import type { HostedLessonContent } from "@/lib/hosted-lessons";
import type { LessonQuiz } from "@/lib/types";

type InteractiveLessonExperienceClientProps = {
  courseSlug: string;
  lessonId: string;
  hostedLesson: HostedLessonContent;
  quiz: LessonQuiz;
};

const InteractiveLessonExperience = dynamic(
  () =>
    import("./interactive-lesson-experience").then(
      (module) => module.InteractiveLessonExperience,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">
          Loading interactive lesson
        </p>
        <p className="mt-2 text-sm text-slate-400">Restoring saved progress…</p>
      </div>
    ),
  },
);

export function InteractiveLessonExperienceClient(
  props: InteractiveLessonExperienceClientProps,
) {
  return <InteractiveLessonExperience {...props} />;
}
