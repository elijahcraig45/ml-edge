"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PythonRunner, checkForbidden } from "@/lib/runtime/python/client";
import { allPassed, type RunOutcome } from "@/lib/runtime/protocol";
import type { CompiledPythonExercise } from "@/lib/curriculum/artifact";
import type { ExerciseProgress } from "@/lib/progress/curriculum-progress";
import { CodeEditor } from "./code-editor";
import { HintLadder } from "./hint-ladder";
import { RunConsole } from "./run-console";
import { TestResults } from "./test-results";
import { DifficultyPill, ExerciseShell } from "./exercise-shell";
import { useLazyVisible } from "./use-lazy-visible";

export function PythonExercise({
  exercise,
  progress,
  onProgress,
}: {
  exercise: CompiledPythonExercise;
  progress: ExerciseProgress;
  onProgress: (mutate: (current: ExerciseProgress) => ExerciseProgress) => void;
}) {
  const [code, setCode] = useState(progress.draft ?? exercise.starter);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [running, setRunning] = useState(false);
  // "booting" is not stored: it is exactly `visible && !ready && !error`.
  const [engineState, setEngineState] = useState<"idle" | "ready" | "error">("idle");

  const runnerRef = useRef<PythonRunner | null>(null);
  const { ref, visible } = useLazyVisible();

  // Boot on viewport entry, not on mount: a lesson with six exercises should
  // not download and start Pyodide six screens early.
  useEffect(() => {
    if (!visible || runnerRef.current) return;
    const runner = new PythonRunner(exercise.packages);
    runnerRef.current = runner;
    runner
      .boot()
      .then(() => setEngineState("ready"))
      .catch(() => setEngineState("error"));
    return () => {
      runner.dispose();
      runnerRef.current = null;
    };
  }, [visible, exercise.packages]);

  const persistDraft = useCallback(
    (next: string) => {
      setCode(next);
      onProgress((current) => ({ ...current, draft: next }));
    },
    [onProgress],
  );

  const handleRun = useCallback(async () => {
    const runner = runnerRef.current;
    if (!runner || running) return;

    const forbidden = checkForbidden(code, exercise.forbid);
    if (forbidden) {
      setOutcome({
        id: exercise.id,
        status: "forbidden",
        stdout: "",
        stderr: forbidden,
        error: { type: "NotAllowed", message: forbidden, traceback: "" },
        tests: [],
        score: { earned: 0, possible: exercise.tests.length },
        durationMs: 0,
      });
      return;
    }

    setRunning(true);
    setOutcome(null);
    try {
      const result = await runner.run(
        {
          id: exercise.id,
          code,
          tests: exercise.tests,
          packages: exercise.packages,
          complexityBudget: exercise.complexityBudget,
          deterministic: true,
        },
        exercise.timeLimitMs,
      );
      setOutcome(result);
      const solved = allPassed(result);
      onProgress((current) => ({
        ...current,
        draft: code,
        attempts: current.attempts + 1,
        bestScore: Math.max(current.bestScore, result.score.earned),
        possible: result.score.possible,
        solved: current.solved || solved,
      }));
    } finally {
      setRunning(false);
    }
  }, [code, exercise, onProgress, running]);

  const visibleTests = useMemo(
    () => exercise.tests.map((t) => ({ id: t.id, label: t.label, hidden: t.hidden })),
    [exercise.tests],
  );

  const solved = progress.solved || (outcome ? allPassed(outcome) : false);

  return (
    <ExerciseShell
      ref={ref}
      exerciseId={exercise.id}
      solved={solved}
      header={
        <>
          <DifficultyPill difficulty={exercise.difficulty} />
          <span className="rounded-full border border-violet-400/30 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-300">
            Python
          </span>
          {exercise.pattern ? (
            <span className="rounded-full border border-white/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {exercise.pattern.replace(/-/g, " ")}
            </span>
          ) : null}
        </>
      }
      title={exercise.title}
      promptHtml={exercise.promptHtml}
      engineNote={engineNote(engineState, visible)}
      editor={
        <CodeEditor
          value={code}
          onChange={persistDraft}
          language="python"
          ariaLabel={`Python editor for ${exercise.title}`}
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
                ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/25"
                : "cursor-not-allowed border-white/10 text-slate-500",
            )}
          >
            {running ? "Running…" : "▶ Run tests"}
          </button>
          {running ? (
            <button
              type="button"
              onClick={() => runnerRef.current?.stop()}
              className="rounded-full border border-rose-400/30 px-4 py-2 text-xs text-rose-300 hover:border-rose-300/50"
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => persistDraft(exercise.starter)}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:border-slate-500"
          >
            Reset
          </button>
        </>
      }
      results={<TestResults outcome={outcome} pendingLabels={visibleTests} />}
      console={<RunConsole outcome={outcome} />}
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

function engineNote(
  state: "idle" | "ready" | "error",
  visible: boolean,
): string | null {
  if (state === "ready") return null;
  if (state === "error") return "Python runtime failed to load";
  return visible ? "Loading Python runtime…" : "Scroll here to load Python";
}
