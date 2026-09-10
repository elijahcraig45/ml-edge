"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Prose } from "./prose";

/** Shared chrome for graded exercises, so Python and SQL look like one system. */
export const ExerciseShell = forwardRef<
  HTMLDivElement,
  {
    exerciseId: string;
    solved: boolean;
    header: ReactNode;
    title: string;
    promptHtml: string;
    engineNote: string | null;
    editor: ReactNode;
    controls: ReactNode;
    results: ReactNode;
    console: ReactNode;
    help: ReactNode;
  }
>(function ExerciseShell(
  {
    exerciseId,
    solved,
    header,
    title,
    promptHtml,
    engineNote,
    editor,
    controls,
    results,
    console: consolePanel,
    help,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-testid={`exercise-${exerciseId}`}
      data-solved={solved ? "true" : "false"}
      className={cn(
        "overflow-hidden rounded-3xl border bg-slate-900/50",
        solved ? "border-emerald-400/30" : "border-white/10",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
        {header}
        {solved ? (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            ✓ Solved
          </span>
        ) : null}
        {engineNote ? (
          <span className="ml-auto font-mono text-[11px] text-slate-500">{engineNote}</span>
        ) : null}
      </div>

      <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-white/10">
        <div className="flex flex-col divide-y divide-white/10">
          <div className="px-5 py-4">
            {/* h3, not h4: an exercise is a sibling of the prose h2 sections
                around it, and skipping a level breaks screen-reader navigation. */}
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <Prose html={promptHtml} className="mt-2 text-sm" />
          </div>
          <div className="px-4 py-4">{editor}</div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">{controls}</div>
        </div>

        <div className="flex flex-col divide-y divide-white/10 border-t border-white/10 lg:border-t-0">
          <div className="px-5 py-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Checks
            </p>
            {results}
          </div>
          {consolePanel}
          <div className="px-5 py-4">{help}</div>
        </div>
      </div>
    </div>
  );
});

const DIFFICULTY_STYLES: Record<number, string> = {
  1: "border-sky-400/30 text-sky-300",
  2: "border-cyan-400/30 text-cyan-300",
  3: "border-amber-400/30 text-amber-300",
  4: "border-orange-400/30 text-orange-300",
  5: "border-rose-400/30 text-rose-300",
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Warm-up",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Brutal",
};

export function DifficultyPill({ difficulty }: { difficulty: number }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em]",
        DIFFICULTY_STYLES[difficulty] ?? "border-white/10 text-slate-400",
      )}
    >
      {DIFFICULTY_LABELS[difficulty] ?? `Level ${difficulty}`}
    </span>
  );
}
