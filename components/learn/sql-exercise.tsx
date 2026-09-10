"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { allPassed, type RunOutcome } from "@/lib/runtime/protocol";
import { ensureDataset, openRunner } from "@/lib/runtime/sql/client";
import { gradeSql } from "@/lib/runtime/sql/grade";
import type { CompiledDataset, CompiledSqlExercise } from "@/lib/curriculum/artifact";
import type { ExerciseProgress } from "@/lib/progress/curriculum-progress";
import { CodeEditor } from "./code-editor";
import { DifficultyPill, ExerciseShell } from "./exercise-shell";
import { HintLadder } from "./hint-ladder";
import { ResultDiff } from "./result-diff";
import { PlanViewer } from "./plan-viewer";
import { ResultTable } from "./result-table";
import { TestResults } from "./test-results";
import { useLazyVisible } from "./use-lazy-visible";

const PENDING_CHECKS = [
  { id: "shape", label: "Result shape matches", hidden: false },
  { id: "rows", label: "Rows match", hidden: false },
];

export function SqlExercise({
  exercise,
  dataset,
  progress,
  onProgress,
}: {
  exercise: CompiledSqlExercise;
  dataset: CompiledDataset;
  progress: ExerciseProgress;
  onProgress: (mutate: (current: ExerciseProgress) => ExerciseProgress) => void;
}) {
  const [sql, setSql] = useState(progress.draft ?? exercise.starter);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [running, setRunning] = useState(false);
  // "booting" is not stored: it is exactly `visible && !ready && !error`.
  const [engineState, setEngineState] = useState<"idle" | "ready" | "error">("idle");

  const { ref, visible } = useLazyVisible();

  // DuckDB is the largest asset on the site; never load it before it is needed.
  useEffect(() => {
    if (!visible || engineState !== "idle") return;
    let cancelled = false;
    ensureDataset(dataset)
      .then(() => !cancelled && setEngineState("ready"))
      .catch(() => !cancelled && setEngineState("error"));
    return () => {
      cancelled = true;
    };
  }, [visible, engineState, dataset]);

  const persistDraft = useCallback(
    (next: string) => {
      setSql(next);
      onProgress((current) => ({ ...current, draft: next }));
    },
    [onProgress],
  );

  const handleRun = useCallback(async () => {
    if (running || engineState !== "ready") return;
    setRunning(true);
    setOutcome(null);
    const runner = await openRunner();
    try {
      const result = await gradeSql(
        runner,
        sql,
        exercise.grading,
        exercise.solution,
        exercise.id,
      );
      setOutcome(result);
      const solved = allPassed(result);
      onProgress((current) => ({
        ...current,
        draft: sql,
        attempts: current.attempts + 1,
        bestScore: Math.max(current.bestScore, result.score.earned),
        possible: result.score.possible,
        solved: current.solved || solved,
      }));
    } catch (error) {
      setOutcome({
        id: exercise.id,
        status: "engine-error",
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        tests: [],
        score: { earned: 0, possible: 1 },
        durationMs: 0,
      });
    } finally {
      await runner.close().catch(() => undefined);
      setRunning(false);
    }
  }, [sql, exercise, onProgress, running, engineState]);

  const solved = progress.solved || (outcome ? allPassed(outcome) : false);

  return (
    <ExerciseShell
      ref={ref}
      exerciseId={exercise.id}
      solved={solved}
      header={
        <>
          <DifficultyPill difficulty={exercise.difficulty} />
          <span className="rounded-full border border-sky-400/30 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-300">
            SQL
          </span>
          <span className="rounded-full border border-white/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {dataset.id}
          </span>
        </>
      }
      title={exercise.title}
      promptHtml={exercise.promptHtml}
      engineNote={sqlEngineNote(engineState, visible)}
      editor={
        <CodeEditor
          value={sql}
          onChange={persistDraft}
          language="sql"
          minRows={10}
          ariaLabel={`SQL editor for ${exercise.title}`}
        />
      }
      controls={
        <>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={engineState !== "ready" || running}
            className={cn(
              "rounded-full border px-5 py-2 text-sm font-semibold",
              engineState === "ready" && !running
                ? "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:border-sky-300 hover:bg-sky-500/25"
                : "cursor-not-allowed border-white/10 text-slate-500",
            )}
          >
            {running ? "Running…" : "▶ Run query"}
          </button>
          <button
            type="button"
            onClick={() => persistDraft(exercise.starter)}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:border-slate-500"
          >
            Reset
          </button>
          <PlanViewer sql={sql} ready={engineState === "ready"} />
        </>
      }
      results={
        <div className="space-y-3">
          <TestResults outcome={outcome} pendingLabels={PENDING_CHECKS} />
          {outcome?.diff ? <ResultDiff diff={outcome.diff} /> : null}
        </div>
      }
      console={
        <div className="border-t border-white/10 px-4 py-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Your result
          </p>
          {outcome?.resultTable ? (
            <ResultTable data={outcome.resultTable} />
          ) : (
            <p className="font-mono text-[11px] text-slate-500">
              {outcome?.stderr || "Run your query to see rows."}
            </p>
          )}
        </div>
      }
      help={
        <HintLadder
          hints={exercise.hintsHtml}
          revealed={progress.hintsRevealed}
          onReveal={(count) =>
            onProgress((current) => ({ ...current, hintsRevealed: count }))
          }
          solutionRevealed={progress.solutionRevealed}
          onRevealSolution={() =>
            onProgress((current) => ({ ...current, solutionRevealed: true }))
          }
          solutionHtml={exercise.solutionWalkthroughHtml}
        />
      }
    />
  );
}

function sqlEngineNote(
  state: "idle" | "ready" | "error",
  visible: boolean,
): string | null {
  if (state === "ready") return null;
  if (state === "error") return "Database failed to load";
  return visible
    ? "Loading DuckDB and the dataset…"
    : "Scroll here to load the database";
}
