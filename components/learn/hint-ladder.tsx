"use client";

import { cn } from "@/lib/utils";

/**
 * Hints reveal one at a time, cheapest nudge first, so a stuck learner gets
 * unstuck without being handed the answer. Reveal counts are recorded in
 * progress — a lesson where everyone opens hint 3 is a lesson that needs work.
 */
export function HintLadder({
  hints,
  revealed,
  onReveal,
  solutionRevealed,
  onRevealSolution,
  solutionHtml,
}: {
  hints: string[];
  revealed: number;
  onReveal: (count: number) => void;
  solutionRevealed: boolean;
  onRevealSolution: () => void;
  solutionHtml: string;
}) {
  const remaining = hints.length - revealed;
  return (
    <div className="space-y-2">
      {hints.slice(0, revealed).map((hint, index) => (
        <div
          key={index}
          className="rounded-xl border border-amber-400/25 bg-amber-500/5 px-3 py-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/70">
            Hint {index + 1}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{hint}</p>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => onReveal(revealed + 1)}
            className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-300/50"
          >
            {revealed === 0 ? "Show a hint" : `Next hint (${remaining} left)`}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRevealSolution}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs",
            solutionRevealed
              ? "border-white/10 text-slate-500"
              : "border-white/10 text-slate-400 hover:border-slate-500",
          )}
        >
          {solutionRevealed ? "Solution shown" : "Show the solution"}
        </button>
      </div>

      {solutionRevealed ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
            How it works
          </p>
          <div
            className="lesson-prose mt-2 text-sm"
            dangerouslySetInnerHTML={{ __html: solutionHtml }}
          />
        </div>
      ) : null}
    </div>
  );
}
