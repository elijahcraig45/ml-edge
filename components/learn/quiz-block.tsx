"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { QuizBlock as QuizBlockData } from "@/lib/curriculum/artifact";
import { Prose } from "./prose";

export function QuizBlock({
  block,
  answers,
  submitted,
  onChange,
}: {
  block: QuizBlockData;
  answers: number[];
  submitted: boolean;
  onChange: (answers: number[], submitted: boolean) => void;
}) {
  const filled = useMemo(
    () => block.questions.map((_, i) => answers[i] ?? -1),
    [answers, block.questions],
  );
  const answeredAll = filled.every((a) => a >= 0);
  const correct = filled.filter((a, i) => a === block.questions[i].answerIndex).length;
  const passed = correct >= block.passing;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-4">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">
          Check yourself
        </p>
        {submitted ? (
          <span
            className={cn(
              "rounded-full border px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
              passed
                ? "border-emerald-400/40 text-emerald-300"
                : "border-amber-400/40 text-amber-300",
            )}
          >
            {correct}/{block.questions.length} correct
          </span>
        ) : null}
      </div>

      <ol className="mt-4 space-y-5">
        {block.questions.map((question, qIndex) => (
          <li key={question.id}>
            <Prose html={question.promptHtml} className="text-sm font-medium text-slate-200" />
            <div className="mt-2 space-y-1.5">
              {question.optionsHtml.map((option, oIndex) => {
                const chosen = filled[qIndex] === oIndex;
                const isAnswer = question.answerIndex === oIndex;
                return (
                  <label
                    key={oIndex}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-sm",
                      !submitted && chosen && "border-indigo-400/40 bg-indigo-500/10",
                      !submitted && !chosen && "border-white/10 hover:border-slate-500",
                      submitted && isAnswer && "border-emerald-400/40 bg-emerald-500/10",
                      submitted && chosen && !isAnswer && "border-rose-400/40 bg-rose-500/10",
                      submitted && !isAnswer && !chosen && "border-white/10 opacity-60",
                    )}
                  >
                    <input
                      type="radio"
                      name={`${block.id}-${question.id}`}
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => {
                        const next = [...filled];
                        next[qIndex] = oIndex;
                        onChange(next, false);
                      }}
                      className="mt-1 accent-indigo-400"
                    />
                    <span
                      className="text-slate-300"
                      dangerouslySetInnerHTML={{ __html: option }}
                    />
                  </label>
                );
              })}
            </div>
            {submitted ? (
              <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                <Prose html={question.explanationHtml} className="text-xs" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex gap-2">
        {submitted ? (
          <button
            type="button"
            onClick={() => onChange([], false)}
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-400 hover:border-slate-500"
          >
            Try again
          </button>
        ) : (
          <button
            type="button"
            disabled={!answeredAll}
            onClick={() => onChange(filled, true)}
            className={cn(
              "rounded-full border px-5 py-1.5 text-xs font-semibold",
              answeredAll
                ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300"
                : "cursor-not-allowed border-white/10 text-slate-500",
            )}
          >
            Check answers
          </button>
        )}
      </div>
    </section>
  );
}
