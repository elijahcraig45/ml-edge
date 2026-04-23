"use client";

import dynamic from "next/dynamic";
import type { DailyQuizDocument } from "@/lib/types";

type QuizComponentClientProps = {
  content: DailyQuizDocument;
};

const QuizComponent = dynamic(
  () => import("./quiz-component").then((module) => module.QuizComponent),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-3xl border border-white/10 bg-slate-900/40"
          />
        ))}
      </div>
    ),
  },
);

export function QuizComponentClient(props: QuizComponentClientProps) {
  return <QuizComponent {...props} />;
}
