"use client";

import { useState } from "react";
import { LessonAudioPlayer } from "@/components/quiz/lesson-audio-player";
import type { DailyMiniLesson } from "@/lib/types";

interface MiniLessonGateProps {
  lesson: DailyMiniLesson;
  children: React.ReactNode;
}

export function MiniLessonGate({ lesson, children }: MiniLessonGateProps) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      {/* Audio player */}
      {lesson.audioUrl && (
        <LessonAudioPlayer audioUrl={lesson.audioUrl} topic={lesson.topic} />
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Today&apos;s mini-lesson · {lesson.topic}
        </p>
        <h2 className="text-xl font-bold text-white">{lesson.headline}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">{lesson.whyItMatters}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((section, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6"
        >
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {section.title}
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {section.body}
          </p>
        </div>
      ))}

      {/* Worked example */}
      {lesson.workedExample && (
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/30 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Worked example
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {lesson.workedExample}
          </p>
        </div>
      )}

      {/* Common pitfalls */}
      {lesson.commonPitfalls.length > 0 && (
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-400">
            Common pitfalls
          </h3>
          <ul className="space-y-2">
            {lesson.commonPitfalls.map((pitfall, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6 text-slate-200">
                <span className="mt-0.5 shrink-0 text-amber-400">⚠</span>
                {pitfall}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bridge + CTA */}
      <div className="rounded-2xl border border-slate-600/50 bg-slate-800/30 p-6">
        {lesson.bridgeToQuiz && (
          <p className="mb-5 text-sm leading-7 text-slate-300">{lesson.bridgeToQuiz}</p>
        )}
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
        >
          I&apos;ve read this — take the quiz →
        </button>
      </div>
    </div>
  );
}
