"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useBadges } from "@/lib/progress/badges";
import { DEFAULT_LEARNER_PATH, type LearnerPath } from "@/lib/curriculum/types";
import type { StageAssessment } from "@/lib/curriculum/assessment";
import { Prose } from "./prose";

const PATH_STORAGE_KEY = "mle.learn.v2.path";

/**
 * The stage gate.
 *
 * Questions are drawn from the stage's own lessons, so passing means the stage
 * was actually learned rather than that a separate exam was crammed.
 */
export function StageAssessmentView({ assessment }: { assessment: StageAssessment }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const { badges, award } = useBadges();

  const answeredAll = assessment.questions.every((q) => answers[q.id] !== undefined);
  const score = useMemo(
    () =>
      assessment.questions.filter((q) => answers[q.id] === q.answerIndex).length,
    [answers, assessment.questions],
  );
  const passed = submitted && score >= assessment.passingScore;
  const existing = badges[assessment.stageId];

  const submit = () => {
    setSubmitted(true);
    if (score >= assessment.passingScore) {
      award({
        stageId: assessment.stageId,
        path: readPath(),
        score,
        outOf: assessment.questions.length,
        earnedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-slate-900/40 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">
          Stage gate
        </p>
        {existing ? (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">
            Passed · {existing.path} path · {existing.score}/{existing.outOf}
          </span>
        ) : null}
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
        {assessment.questions.length} questions drawn from across the stage.
        {" "}
        {assessment.passingScore} correct to pass. Aim to finish inside{" "}
        {assessment.timeboxMinutes} minutes — the clock is not enforced, but a
        stage you have absorbed should not need longer.
      </p>

      <ol className="mt-6 space-y-6">
        {assessment.questions.map((question, index) => (
          <li key={question.id}>
            <div className="flex gap-3">
              <span className="font-mono text-xs tabular-nums text-slate-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <Prose html={question.promptHtml} className="text-sm text-slate-200" />
                <div className="mt-2 space-y-1.5">
                  {question.optionsHtml.map((option, optionIndex) => {
                    const chosen = answers[question.id] === optionIndex;
                    const isAnswer = question.answerIndex === optionIndex;
                    return (
                      <label
                        key={optionIndex}
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
                          name={question.id}
                          checked={chosen}
                          disabled={submitted}
                          onChange={() =>
                            setAnswers((a) => ({ ...a, [question.id]: optionIndex }))
                          }
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
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {submitted ? (
          <>
            <span
              className={cn(
                "rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em]",
                passed
                  ? "border-emerald-400/40 text-emerald-300"
                  : "border-amber-400/40 text-amber-300",
              )}
            >
              {score}/{assessment.questions.length} · {passed ? "passed" : "not yet"}
            </span>
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-400 hover:border-slate-500"
            >
              Try again
            </button>
            {!passed ? (
              <p className="w-full text-xs text-slate-500">
                Go back to the lessons behind the questions you missed — the
                explanations above name the idea each one is testing.
              </p>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            disabled={!answeredAll}
            onClick={submit}
            className={cn(
              "rounded-full border px-5 py-2 text-sm font-semibold",
              answeredAll
                ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300"
                : "cursor-not-allowed border-white/10 text-slate-500",
            )}
          >
            Submit
          </button>
        )}
      </div>
    </section>
  );
}

function readPath(): LearnerPath {
  try {
    const stored = window.localStorage.getItem(PATH_STORAGE_KEY);
    if (stored) return stored as LearnerPath;
  } catch {
    // default below
  }
  return DEFAULT_LEARNER_PATH;
}
